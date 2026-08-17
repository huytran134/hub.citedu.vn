import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// GET — Trả về danh sách điểm danh của buổi học này
// status = null nếu học viên chưa được điểm danh
export async function GET(
  _: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  // Kiểm tra session tồn tại + quyền của CNL
  const session = await prisma.classSession.findUnique({
    where: { id: params.sessionId },
    include: { class: { select: { id: true, homeroom_id: true } } },
  })

  if (!session) {
    return NextResponse.json({ error: 'Không tìm thấy buổi học' }, { status: 404 })
  }

  if (user.role === 'HOMEROOM' && session.class.homeroom_id !== user.id) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
  }

  // Lấy toàn bộ enrollment đang học của lớp
  const enrollments = await prisma.enrollment.findMany({
    where: {
      class_id: session.class.id,
      status: { in: ['active', 'waitlist', 'suspended'] },
    },
    include: {
      contact: { select: { name: true, phone: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  // Lấy attendance hiện có của buổi này (Attendance không có soft delete)
  const attendances = await prisma.attendance.findMany({
    where: { session_id: params.sessionId },
    select: { enrollment_id: true, status: true },
  })

  const attendanceMap = Object.fromEntries(attendances.map((a) => [a.enrollment_id, a.status]))

  return NextResponse.json(
    enrollments.map((e) => ({
      enrollment_id: e.id,
      contact_name: e.contact.name,
      contact_phone: e.contact.phone,
      status: attendanceMap[e.id] ?? null,
    })),
  )
}
