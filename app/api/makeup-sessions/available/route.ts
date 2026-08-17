import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// GET /api/makeup-sessions/available?enrollment_id=...&original_session_id=...
// Trả về danh sách buổi học có thể dùng để bù:
//   - Cùng chương trình (program_id) với lớp gốc
//   - Ngày học >= hôm nay
//   - Không phải lớp gốc của học viên
//   - Lớp đang active
export async function GET(req: NextRequest) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const { searchParams } = new URL(req.url)
  const enrollment_id = searchParams.get('enrollment_id')
  const original_session_id = searchParams.get('original_session_id')

  if (!enrollment_id || !original_session_id) {
    return NextResponse.json(
      { error: 'Cần enrollment_id và original_session_id' },
      { status: 400 },
    )
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollment_id },
    include: {
      class: { select: { id: true, program_id: true, homeroom_id: true } },
    },
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'Không tìm thấy enrollment' }, { status: 404 })
  }

  if (user.role === 'HOMEROOM' && enrollment.class.homeroom_id !== user.id) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
  }

  const originalSession = await prisma.classSession.findUnique({
    where: { id: original_session_id },
    select: { lesson_id: true, title: true },
  })

  if (!originalSession) {
    return NextResponse.json({ error: 'Không tìm thấy buổi gốc' }, { status: 404 })
  }

  const now = new Date()

  // Tìm các buổi học từ cùng chương trình, ngày >= hôm nay, không phải lớp gốc
  const sessions = await prisma.classSession.findMany({
    where: {
      deleted_at: null,
      scheduled_at: { gte: now },
      class: {
        program_id: enrollment.class.program_id,
        status: { in: ['forming', 'active'] },
        id: { not: enrollment.class_id },
        deleted_at: null,
      },
      // Ưu tiên match lesson_id nếu buổi gốc có lesson_id
      ...(originalSession.lesson_id
        ? { lesson_id: originalSession.lesson_id }
        : {}),
    },
    include: {
      class: { select: { name: true, homeroom_id: true } },
      lesson: { select: { title: true, session_number: true } },
    },
    orderBy: { scheduled_at: 'asc' },
    take: 20,
  })

  // Nếu match lesson_id không có kết quả, thả điều kiện lesson để tìm rộng hơn
  const fallback =
    sessions.length === 0 && originalSession.lesson_id
      ? await prisma.classSession.findMany({
          where: {
            deleted_at: null,
            scheduled_at: { gte: now },
            class: {
              program_id: enrollment.class.program_id,
              status: { in: ['forming', 'active'] },
              id: { not: enrollment.class_id },
              deleted_at: null,
            },
          },
          include: {
            class: { select: { name: true, homeroom_id: true } },
            lesson: { select: { title: true, session_number: true } },
          },
          orderBy: { scheduled_at: 'asc' },
          take: 20,
        })
      : []

  const result = sessions.length > 0 ? sessions : fallback

  return NextResponse.json(
    result.map((s) => ({
      id: s.id,
      class_id: s.class_id,
      class_name: s.class.name,
      session_number: s.session_number,
      title: s.lesson?.title ?? s.title ?? null,
      scheduled_at: s.scheduled_at,
      lesson_match: !!originalSession.lesson_id && s.lesson_id === originalSession.lesson_id,
    })),
  )
}
