import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAdmin()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body không hợp lệ' }, { status: 400 })
  }

  const { sessions } = body as {
    sessions: Array<{ session_number: number; scheduled_at: string; title?: string }>
  }

  if (!sessions?.length) {
    return NextResponse.json({ error: 'Danh sách buổi học không được để trống' }, { status: 400 })
  }

  // Validate từng session trước khi insert
  for (const s of sessions) {
    if (!s.scheduled_at) {
      return NextResponse.json({ error: 'Dữ liệu buổi học thiếu scheduled_at' }, { status: 400 })
    }
    const d = new Date(s.scheduled_at)
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { error: `Ngày giờ không hợp lệ: ${s.scheduled_at}` },
        { status: 400 }
      )
    }
  }

  try {
    // Kiểm tra lớp tồn tại
    const cls = await prisma.class.findUnique({
      where: { id: params.id },
      include: { program: { select: { branch: true } } },
    })

    if (!cls) {
      return NextResponse.json({ error: 'Không tìm thấy lớp học' }, { status: 404 })
    }
    if (cls.program.branch === 'coaching') {
      return NextResponse.json(
        { error: 'Lớp Coaching 1-1 không sử dụng tính năng lịch buổi học' },
        { status: 400 }
      )
    }

    // $queryRaw để bypass soft delete middleware — phải tính MAX kể cả records đã xóa mềm
    // nếu dùng findFirst thì middleware lọc mất deleted records → startingSessionNumber sai → P2002
    const maxResult = await prisma.$queryRaw<[{ max_num: number | null }]>`
      SELECT COALESCE(MAX(session_number), 0) AS max_num
      FROM class_sessions
      WHERE class_id = ${params.id}
    `
    const startingSessionNumber = (maxResult[0]?.max_num ?? 0) + 1

    // Sắp xếp theo ngày giờ rồi gán session_number tiếp nối — bỏ qua số thứ tự client gửi lên
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )

    // skipDuplicates: false — để lỗi nổi lên thay vì âm thầm bỏ qua
    const result = await prisma.classSession.createMany({
      data: sorted.map((s, i) => ({
        class_id: params.id,
        session_number: startingSessionNumber + i,
        scheduled_at: new Date(s.scheduled_at),
        title: s.title ?? null,
        created_by_id: user!.id,
      })),
      skipDuplicates: false,
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Không tạo được buổi học nào — có thể số thứ tự bị trùng, vui lòng thử lại' },
        { status: 409 }
      )
    }

    // Trả về toàn bộ danh sách buổi để client refresh ngay
    const created = await prisma.classSession.findMany({
      where: { class_id: params.id },
      orderBy: { session_number: 'asc' },
    })

    return NextResponse.json({ sessions: created, created: result.count }, { status: 201 })

  } catch (error) {
    console.error('[bulk-create sessions] Lỗi khi tạo lịch:', {
      classId: params.id,
      sessionCount: sessions?.length,
      error,
    })

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Lịch học bị trùng — lớp này đã có buổi học với số thứ tự này' },
          { status: 409 }
        )
      }
    }

    const message = error instanceof Error ? error.message : 'Lỗi server không xác định'
    return NextResponse.json(
      { error: `Không tạo được lịch học: ${message}` },
      { status: 500 }
    )
  }
}
