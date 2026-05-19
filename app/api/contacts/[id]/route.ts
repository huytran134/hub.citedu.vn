import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { response } = await requireHomeroom()
  if (response) return response

  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      notes: {
        where: { deleted_at: null },
        include: { created_by: { select: { id: true, full_name: true } } },
        orderBy: { created_at: 'desc' },
      },
      enrollments: {
        where: { deleted_at: null },
        include: {
          class: { select: { id: true, name: true } },
          // Middleware không xử lý nested include → deleted_at: null tường minh
          payments: { where: { status: 'approved', deleted_at: null }, select: { amount: true } },
        },
        orderBy: { created_at: 'desc' },
      },
      referrer: { select: { id: true, name: true } },
      created_by: { select: { full_name: true } },
    },
  })

  if (!contact) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

  // Tính công nợ realtime — không lưu vào DB
  const enrollmentsWithDebt = contact.enrollments.map((e) => {
    const paid = e.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    return { ...e, agreed_price: Number(e.agreed_price), paid, debt: Number(e.agreed_price) - paid }
  })

  return NextResponse.json({ ...contact, enrollments: enrollmentsWithDebt })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { name, email, zalo_id, date_of_birth, address, gender, source, status } = body

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(zalo_id !== undefined && { zalo_id: zalo_id?.trim() || null }),
      ...(date_of_birth !== undefined && { date_of_birth: date_of_birth ? new Date(date_of_birth) : null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(gender !== undefined && { gender: gender || null }),
      ...(source !== undefined && { source }),
      ...(status !== undefined && { status }),
    },
  })

  return NextResponse.json(contact)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireAdmin()
  if (response) return response

  // Không cho xóa nếu đang có enrollment active
  const activeEnrollment = await prisma.enrollment.findFirst({
    where: { contact_id: params.id, status: 'active' },
    select: { id: true },
  })
  if (activeEnrollment) {
    return NextResponse.json(
      { error: 'Không thể xóa — Contact này có Enrollment đang active' },
      { status: 409 },
    )
  }

  await prisma.contact.update({
    where: { id: params.id },
    data: { deleted_at: new Date(), deleted_by_id: user!.id },
  })

  return NextResponse.json({ success: true })
}
