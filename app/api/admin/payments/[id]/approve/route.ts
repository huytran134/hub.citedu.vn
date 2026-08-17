import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
  const { paid_at } = body

  if (!paid_at) {
    return NextResponse.json(
      { error: 'Bắt buộc nhập ngày nhận tiền (paid_at)' },
      { status: 400 },
    )
  }

  const paidAtDate = new Date(paid_at)
  if (isNaN(paidAtDate.getTime())) {
    return NextResponse.json({ error: 'Ngày nhận tiền không hợp lệ' }, { status: 400 })
  }

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  if (paidAtDate > sevenDaysFromNow) {
    return NextResponse.json(
      { error: 'Ngày nhận tiền không được quá 7 ngày trong tương lai' },
      { status: 400 },
    )
  }

  const payment = await prisma.payment.findUnique({ where: { id: params.id } })
  if (!payment) return NextResponse.json({ error: 'Không tìm thấy phiếu thu' }, { status: 404 })

  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'Phiếu thu đã được xử lý trước đó' }, { status: 400 })
  }

  const updated = await prisma.payment.update({
    where: { id: params.id },
    data: {
      status: 'approved',
      paid_at: paidAtDate,
      approved_by_id: user.id,
      approved_at: new Date(),
    },
  })

  // Badge tự cập nhật — invalidate layout cache để đếm lại phiếu pending
  revalidatePath('/finance')
  revalidatePath('/dashboard')

  return NextResponse.json({ ...updated, amount: Number(updated.amount) })
}
