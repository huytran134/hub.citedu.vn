import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
  const { dropped_reason, confirmedDebt } = body

  if (!dropped_reason?.trim()) {
    return NextResponse.json({ error: 'Lý do thôi học là bắt buộc' }, { status: 400 })
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id: params.id } })
  if (!enrollment) {
    return NextResponse.json({ error: 'Không tìm thấy học viên' }, { status: 404 })
  }

  if (enrollment.status === 'dropped') {
    return NextResponse.json({ error: 'Học viên đã thôi học' }, { status: 400 })
  }
  if (enrollment.status === 'completed') {
    return NextResponse.json({ error: 'Học viên đã hoàn thành khóa học' }, { status: 400 })
  }
  if (!['active', 'suspended'].includes(enrollment.status)) {
    return NextResponse.json({ error: 'Không thể thôi học từ trạng thái hiện tại' }, { status: 400 })
  }

  // Tính công nợ realtime từ agreed_price (không phải Program.price)
  const payments = await prisma.payment.findMany({
    where: { enrollment_id: params.id, status: 'approved' },
    select: { amount: true },
  })
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const debt = Number(enrollment.agreed_price) - totalPaid

  if (debt > 0 && !confirmedDebt) {
    return NextResponse.json({
      requiresConfirmation: true,
      debt,
      debtFormatted: Number(debt).toLocaleString('vi-VN') + ' đ',
    })
  }

  const updated = await prisma.enrollment.update({
    where: { id: params.id },
    data: {
      status: 'dropped',
      dropped_at: new Date(),
      dropped_reason: dropped_reason.trim(),
    },
    select: { id: true, status: true },
  })

  return NextResponse.json(updated)
}
