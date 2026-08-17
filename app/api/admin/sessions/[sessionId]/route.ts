import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// PATCH — Admin sửa thông tin buổi học (không sửa zoom_link và notes — đó là quyền CNL)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { title, scheduled_at, duration_min, material_url } = body

  const session = await prisma.classSession.findUnique({
    where: { id: params.sessionId },
  })
  if (!session) {
    return NextResponse.json({ error: 'Không tìm thấy buổi học' }, { status: 404 })
  }

  const updated = await prisma.classSession.update({
    where: { id: params.sessionId },
    data: {
      ...(title !== undefined && { title }),
      ...(scheduled_at !== undefined && { scheduled_at: new Date(scheduled_at) }),
      ...(duration_min !== undefined && { duration_min: Number(duration_min) }),
      ...(material_url !== undefined && { material_url }),
    },
  })

  return NextResponse.json({ session: updated })
}

// DELETE — Admin xóa buổi học (chỉ khi chưa có Attendance)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const session = await prisma.classSession.findUnique({
    where: { id: params.sessionId },
    include: { _count: { select: { attendances: true } } },
  })
  if (!session) {
    return NextResponse.json({ error: 'Không tìm thấy buổi học' }, { status: 404 })
  }

  if (session._count.attendances > 0) {
    return NextResponse.json(
      { error: 'Buổi học đã có dữ liệu điểm danh, không thể xóa' },
      { status: 409 }
    )
  }

  // Soft delete — consistent với pattern của dự án
  await prisma.classSession.update({
    where: { id: params.sessionId },
    data: {
      deleted_at: new Date(),
      deleted_by_id: user!.id,
    },
  })

  return NextResponse.json({ success: true })
}
