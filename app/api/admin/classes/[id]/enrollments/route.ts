import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/utils'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin()
  if (response) return response

  const enrollments = await prisma.enrollment.findMany({
    where: { class_id: params.id },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      payments: {
        where: { status: 'approved', deleted_at: null },
        select: { amount: true },
      },
    },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json(
    enrollments.map((e) => {
      const paid = e.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      return {
        ...e,
        agreed_price: Number(e.agreed_price),
        paid,
        debt: Number(e.agreed_price) - paid,
        payments: undefined,
      }
    }),
  )
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
  const { phone, name, agreed_price } = body

  if (!phone || !name || agreed_price === undefined || agreed_price === null) {
    return NextResponse.json(
      { error: 'Thiếu thông tin bắt buộc: phone, name, agreed_price' },
      { status: 400 },
    )
  }

  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    include: {
      program: { select: { branch: true } },
      _count: { select: { enrollments: { where: { status: { not: 'dropped' } } } } },
    },
  })

  if (!cls) return NextResponse.json({ error: 'Không tìm thấy lớp' }, { status: 404 })

  if (cls._count.enrollments >= cls.max_students) {
    return NextResponse.json(
      { error: `Lớp đã đủ ${cls.max_students} học viên` },
      { status: 400 },
    )
  }

  // Smart Match: chuẩn hóa SĐT để tìm Contact
  const normalizedPhone = normalizePhone(phone)
  let contact = await prisma.contact.findFirst({
    where: { phone: { in: [phone.trim(), normalizedPhone] } },
  })

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        phone: normalizedPhone,
        name: name.trim(),
        status: 'customer',
        created_by_id: user.id,
      },
    })
  }

  // Kiểm tra trùng enrollment
  const existing = await prisma.enrollment.findUnique({
    where: { contact_id_class_id: { contact_id: contact.id, class_id: params.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Học viên đã có trong lớp này' }, { status: 409 })
  }

  // Đếm buổi đã học để cảnh báo vào muộn
  const sessionsCompleted = await prisma.classSession.count({
    where: { class_id: params.id, is_completed: true },
  })

  const enrollment = await prisma.enrollment.create({
    data: {
      contact_id: contact.id,
      class_id: params.id,
      agreed_price: BigInt(agreed_price),
      status: cls.status === 'active' ? 'active' : 'waitlist',
      joined_late: sessionsCompleted > 0,
      joined_at_session: sessionsCompleted > 0 ? sessionsCompleted : null,
      created_by_id: user.id,
    },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
    },
  })

  return NextResponse.json(
    {
      ...enrollment,
      agreed_price: Number(enrollment.agreed_price),
      paid: 0,
      debt: Number(enrollment.agreed_price),
      warning: sessionsCompleted > 0 ? `Lớp đã học ${sessionsCompleted} buổi` : null,
    },
    { status: 201 },
  )
}
