import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = new Set(['attended', 'absent', 'scheduled'])

// PATCH — CNL lớp tiếp nhận (lớp B) điểm danh học viên học bù
// Chỉ cập nhật attendance_status — KHÔNG tác động đến Attendance lớp gốc
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const makeup = await prisma.makeupSession.findUnique({
    where: { id: params.id },
    include: {
      makeupSession: {
        include: {
          class: { select: { id: true, homeroom_id: true } },
        },
      },
    },
  })

  if (!makeup || makeup.deleted_at) {
    return NextResponse.json({ error: 'Không tìm thấy lịch học bù' }, { status: 404 })
  }

  // CNL chỉ được điểm danh buổi học bù thuộc lớp mình (lớp tiếp nhận)
  if (
    user.role === 'HOMEROOM' &&
    makeup.makeupSession.class.homeroom_id !== user.id
  ) {
    return NextResponse.json(
      { error: 'CNL chỉ được điểm danh học viên bù trong lớp mình phụ trách' },
      { status: 403 },
    )
  }

  const body = await req.json()
  const { attendance_status } = body

  if (!attendance_status || !VALID_STATUSES.has(attendance_status)) {
    return NextResponse.json(
      { error: 'attendance_status không hợp lệ (attended | absent | scheduled)' },
      { status: 400 },
    )
  }

  const updated = await prisma.makeupSession.update({
    where: { id: params.id },
    data: { attendance_status },
  })

  return NextResponse.json(updated)
}
