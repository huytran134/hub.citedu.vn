import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const body = await req.json()
  const { enrollment_id, amount, reason, refund_method } = body

  if (!enrollment_id || !amount || !reason || !refund_method) {
    return NextResponse.json(
      { error: 'Thiếu thông tin bắt buộc: enrollment_id, amount, reason, refund_method' },
      { status: 400 },
    )
  }

  if (!reason.trim()) {
    return NextResponse.json({ error: 'Lý do hoàn tiền không được để trống' }, { status: 400 })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollment_id },
    include: {
      class: {
        select: {
          homeroom_id: true,
          program: { select: { branch: true } },
        },
      },
    },
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'Không tìm thấy đăng ký học' }, { status: 404 })
  }

  // CNL chỉ được tạo lệnh hoàn cho lớp mình phụ trách
  if (user.role === 'HOMEROOM' && enrollment.class.homeroom_id !== user.id) {
    return NextResponse.json(
      { error: 'Không có quyền tạo lệnh hoàn tiền cho lớp này' },
      { status: 403 },
    )
  }

  // Chặn Nhánh 2 (Coaching) — quy tắc cứng, không exception
  if (enrollment.class.program.branch === 'coaching') {
    return NextResponse.json(
      {
        error:
          'Không thể tạo lệnh hoàn tiền cho chương trình Coaching 1-1. Đây là quy định của CiT EDU.',
      },
      { status: 403 },
    )
  }

  const amountNum = Number(amount)
  if (!amountNum || amountNum <= 0) {
    return NextResponse.json({ error: 'Số tiền phải lớn hơn 0' }, { status: 400 })
  }

  // Tính số tiền tối đa có thể hoàn = đã đóng approved - đã hoàn approved
  const [approvedPayments, approvedRefunds] = await Promise.all([
    prisma.payment.findMany({
      where: { enrollment_id, status: 'approved', deleted_at: null },
      select: { amount: true },
    }),
    prisma.refund.findMany({
      where: { enrollment_id, status: 'approved', deleted_at: null },
      select: { amount: true },
    }),
  ])

  const totalApproved = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalRefunded = approvedRefunds.reduce((sum, r) => sum + Number(r.amount), 0)
  const maxRefundable = totalApproved - totalRefunded

  if (amountNum > maxRefundable) {
    return NextResponse.json(
      {
        error: `Số tiền hoàn (${amountNum.toLocaleString('vi-VN')} đ) vượt quá số tiền có thể hoàn (${maxRefundable.toLocaleString('vi-VN')} đ)`,
      },
      { status: 400 },
    )
  }

  const refund = await prisma.refund.create({
    data: {
      enrollment_id,
      amount: BigInt(amountNum),
      reason: reason.trim(),
      refund_method,
      status: 'pending',
      created_by_id: user.id,
    },
  })

  return NextResponse.json({ ...refund, amount: Number(refund.amount) }, { status: 201 })
}
