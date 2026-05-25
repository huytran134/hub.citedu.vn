import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const body = await request.json()
  const { class_id, agreed_price } = body

  if (!class_id || typeof class_id !== 'string') {
    return NextResponse.json({ error: 'Vui lòng chọn lớp học' }, { status: 400 })
  }
  if (!agreed_price || Number(agreed_price) <= 0) {
    return NextResponse.json({ error: 'Học phí thỏa thuận phải lớn hơn 0' }, { status: 400 })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: params.id },
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'Không tìm thấy đăng ký' }, { status: 404 })
  }

  if (enrollment.status !== 'waitlist') {
    return NextResponse.json(
      { error: 'Chỉ có thể kích hoạt học viên đang trong danh sách chờ' },
      { status: 400 }
    )
  }

  // Kiểm tra lớp đích tồn tại và chưa đầy
  const targetClass = await prisma.class.findUnique({
    where: { id: class_id },
    include: {
      _count: {
        select: {
          enrollments: { where: { status: { in: ['active', 'suspended'] }, deleted_at: null } },
        },
      },
    },
  })

  if (!targetClass) {
    return NextResponse.json({ error: 'Lớp học không tồn tại' }, { status: 404 })
  }

  if (targetClass._count.enrollments >= targetClass.max_students) {
    return NextResponse.json(
      { error: `Lớp "${targetClass.name}" đã đủ ${targetClass.max_students} học viên` },
      { status: 400 }
    )
  }

  const updated = await prisma.enrollment.update({
    where: { id: params.id },
    data: {
      status: 'active',
      class_id,
      agreed_price: BigInt(Math.round(Number(agreed_price))),
    },
    include: {
      contact: { select: { name: true } },
      class: { select: { name: true } },
    },
  })

  revalidatePath('/classes')

  return NextResponse.json({
    id: updated.id,
    contact_name: updated.contact.name,
    class_name: updated.class.name,
  })
}
