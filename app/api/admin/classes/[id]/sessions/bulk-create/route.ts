import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { sessions } = body as {
    sessions: Array<{ session_number: number; scheduled_at: string; title?: string }>
  }

  if (!sessions?.length) {
    return NextResponse.json({ error: 'Danh sách buổi học không được để trống' }, { status: 400 })
  }

  // Kiểm tra lớp tồn tại và không phải Nhánh 2
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
  // Wrap try/catch: middleware tự thêm deleted_at:null — nếu cột chưa có trên DB thì bỏ qua check
  if (sessions.length > 1) {
    try {
      const activeCount = await prisma.classSession.count({
        where: { class_id: params.id },
      })
      if (activeCount > 0) {
        return NextResponse.json(
          { error: 'Lớp đã có lịch học. Dùng "Thêm buổi" để thêm từng buổi riêng lẻ.' },
          { status: 409 }
        )
      }
    } catch {
      // DB chưa có cột deleted_at → bỏ qua check, cho phép tạo
    }
  }

  await prisma.classSession.createMany({
    data: sessions.map((s) => ({
      class_id: params.id,
      session_number: s.session_number,
      scheduled_at: new Date(s.scheduled_at),
      title: s.title ?? null,
      created_by_id: user!.id,
    })),
  })

  // Wrap try/catch: nếu DB chưa có cột deleted_at thì trả về [] — client sẽ refresh
  let created: Awaited<ReturnType<typeof prisma.classSession.findMany>> = []
  try {
    created = await prisma.classSession.findMany({
      where: { class_id: params.id },
      orderBy: { session_number: 'asc' },
    })
  } catch {
    // DB chưa có cột deleted_at — sessions đã được tạo, client tự refresh sẽ thấy
  }

  return NextResponse.json({ sessions: created }, { status: 201 })
}
