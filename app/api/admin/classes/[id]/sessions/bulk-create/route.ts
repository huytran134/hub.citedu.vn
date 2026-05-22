import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

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
    if (!s.session_number || !s.scheduled_at) {
      return NextResponse.json({ error: 'Dữ liệu buổi học thiếu session_number hoặc scheduled_at' }, { status: 400 })
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

    // Chỉ chặn bulk create nhiều buổi nếu lớp đã có lịch (tránh tạo trùng toàn bộ lịch)
    // Thêm 1 buổi lẻ (sessions.length === 1) thì luôn cho phép
    if (sessions.length > 1) {
      let activeCount = 0
      try {
        activeCount = await prisma.classSession.count({
          where: { class_id: params.id },
        })
      } catch (countErr) {
        // Cột deleted_at chưa có trên DB hoặc bảng chưa migrate đầy đủ → bỏ qua check
        console.warn('[bulk-create sessions] count() failed, skipping duplicate check:', countErr)
      }
      if (activeCount > 0) {
        return NextResponse.json(
          { error: 'Lớp đã có lịch học. Dùng "Thêm buổi" để thêm từng buổi riêng lẻ.' },
          { status: 409 }
        )
      }
    }

    const result = await prisma.classSession.createMany({
      data: sessions.map((s) => ({
        class_id: params.id,
        session_number: s.session_number,
        scheduled_at: new Date(s.scheduled_at),
        title: s.title ?? null,
        created_by_id: user!.id,
      })),
      skipDuplicates: true,
    })

    // Trả về danh sách buổi vừa tạo để client cập nhật ngay
    let created: Awaited<ReturnType<typeof prisma.classSession.findMany>> = []
    try {
      created = await prisma.classSession.findMany({
        where: { class_id: params.id },
        orderBy: { session_number: 'asc' },
      })
    } catch {
      // Bảng chưa có cột deleted_at — sessions đã tạo xong, client tự refresh sẽ thấy
    }

    return NextResponse.json({ sessions: created, created: result.count }, { status: 201 })

  } catch (error) {
    console.error('[bulk-create sessions] Lỗi khi tạo lịch:', {
      classId: params.id,
      sessionCount: sessions?.length,
      error,
    })

    const message = error instanceof Error ? error.message : 'Lỗi server không xác định'
    return NextResponse.json(
      { error: `Không tạo được lịch học: ${message}` },
      { status: 500 }
    )
  }
}
