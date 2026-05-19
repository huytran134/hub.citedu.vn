import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const body = await req.json()
  const { enrollment_id, amount, method, note } = body

  if (!enrollment_id || !amount || !method) {
    return NextResponse.json(
      { error: 'Thiếu thông tin bắt buộc: enrollment_id, amount, method' },
      { status: 400 },
    )
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollment_id },
    include: {
      class: { select: { homeroom_id: true } },
    },
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'Không tìm thấy đăng ký học' }, { status: 404 })
  }

  // CNL chỉ được tạo phiếu cho lớp mình phụ trách
  if (user.role === 'HOMEROOM' && enrollment.class.homeroom_id !== user.id) {
    return NextResponse.json(
      { error: 'Không có quyền tạo phiếu thu cho lớp này' },
      { status: 403 },
    )
  }

  const payment = await prisma.payment.create({
    data: {
      enrollment_id,
      amount: BigInt(amount),
      method,
      status: 'pending',
      note: note?.trim() || null,
      created_by_id: user.id,
    },
  })

  return NextResponse.json({ ...payment, amount: Number(payment.amount) }, { status: 201 })
}
