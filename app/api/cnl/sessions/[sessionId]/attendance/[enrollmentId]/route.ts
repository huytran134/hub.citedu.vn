import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = new Set(['present', 'absent', 'late', 'leave_early'])

// PATCH — Upsert điểm danh (tạo mới hoặc cập nhật) cho 1 học viên trong 1 buổi
// Attendance không có soft delete — chỉ update status, không xóa
export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string; enrollmentId: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  // Kiểm tra session + quyền CNL
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

  // Kiểm tra enrollment thuộc đúng lớp này
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: params.enrollmentId, class_id: session.class.id },
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'Không tìm thấy học viên trong lớp' }, { status: 404 })
  }

  const body = await req.json()
  const { status } = body

  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: 'Trạng thái không hợp lệ (present | absent | late | leave_early)' },
      { status: 400 },
    )
  }

  // Upsert — Attendance không có soft delete, chỉ tạo hoặc update
  const attendance = await prisma.attendance.upsert({
    where: {
      enrollment_id_session_id: {
        enrollment_id: params.enrollmentId,
        session_id: params.sessionId,
      },
    },
    create: {
      enrollment_id: params.enrollmentId,
      session_id: params.sessionId,
      status,
      recorded_by_id: user.id,
    },
    update: {
      status,
      recorded_by_id: user.id,
    },
  })

  return NextResponse.json(attendance)
}
