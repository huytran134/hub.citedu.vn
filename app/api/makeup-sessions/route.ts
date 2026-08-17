import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// POST — Đăng ký lịch học bù cho học viên
// CNL: chỉ đăng ký được cho học viên lớp mình phụ trách
// Admin: đăng ký được cho bất kỳ học viên nào
export async function POST(req: NextRequest) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const body = await req.json()
  const { enrollment_id, original_session_id, makeup_session_id, note } = body

  if (!enrollment_id || !original_session_id || !makeup_session_id) {
    return NextResponse.json(
      { error: 'Thiếu thông tin bắt buộc: enrollment_id, original_session_id, makeup_session_id' },
      { status: 400 },
    )
  }

  // Lấy enrollment + lớp gốc để kiểm tra quyền
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollment_id },
    include: {
      class: { select: { id: true, homeroom_id: true, program_id: true } },
    },
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'Không tìm thấy enrollment' }, { status: 404 })
  }

  // CNL chỉ đăng ký được cho học viên lớp mình phụ trách
  if (user.role === 'HOMEROOM' && enrollment.class.homeroom_id !== user.id) {
    return NextResponse.json(
      { error: 'CNL chỉ được đăng ký học bù cho học viên lớp mình phụ trách' },
      { status: 403 },
    )
  }

  // Kiểm tra buổi gốc thuộc lớp của enrollment
  const originalSession = await prisma.classSession.findUnique({
    where: { id: original_session_id },
    select: { id: true, class_id: true, lesson_id: true, title: true },
  })

  if (!originalSession || originalSession.class_id !== enrollment.class_id) {
    return NextResponse.json(
      { error: 'Buổi gốc không thuộc lớp của học viên' },
      { status: 400 },
    )
  }

  // Kiểm tra buổi bù không phải lớp gốc
  const makeupSession = await prisma.classSession.findUnique({
    where: { id: makeup_session_id },
    select: { id: true, class_id: true, scheduled_at: true },
  })

  if (!makeupSession) {
    return NextResponse.json({ error: 'Không tìm thấy buổi học bù' }, { status: 404 })
  }

  if (makeupSession.class_id === enrollment.class_id) {
    return NextResponse.json(
      { error: 'Buổi bù không được là buổi thuộc lớp gốc' },
      { status: 400 },
    )
  }

  if (new Date(makeupSession.scheduled_at) < new Date()) {
    return NextResponse.json(
      { error: 'Buổi bù phải là buổi trong tương lai' },
      { status: 400 },
    )
  }

  // Tạo MakeupSession
  const makeupRecord = await prisma.makeupSession.create({
    data: {
      enrollment_id,
      original_session_id,
      makeup_session_id,
      registered_by_id: user.id,
      note: note ?? null,
    },
    include: {
      makeupSession: {
        select: {
          scheduled_at: true,
          title: true,
          class: { select: { name: true } },
        },
      },
      originalSession: {
        select: { session_number: true, title: true },
      },
    },
  })

  return NextResponse.json(makeupRecord, { status: 201 })
}
