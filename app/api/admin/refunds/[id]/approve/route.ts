import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
  const { refunded_at } = body

  if (!refunded_at) {
    return NextResponse.json(
      { error: 'Bắt buộc nhập ngày trả tiền thực tế (refunded_at)' },
      { status: 400 },
    )
  }

  const refundedAtDate = new Date(refunded_at)
  if (isNaN(refundedAtDate.getTime())) {
    return NextResponse.json({ error: 'Ngày trả tiền không hợp lệ' }, { status: 400 })
  }

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  if (refundedAtDate > sevenDaysFromNow) {
    return NextResponse.json(
      { error: 'Ngày trả tiền không được quá 7 ngày trong tương lai' },
      { status: 400 },
    )
  }

  const refund = await prisma.refund.findUnique({ where: { id: params.id } })
  if (!refund) {
    return NextResponse.json({ error: 'Không tìm thấy lệnh hoàn tiền' }, { status: 404 })
  }

  if (refund.status !== 'pending') {
    return NextResponse.json({ error: 'Lệnh hoàn tiền đã được xử lý trước đó' }, { status: 400 })
  }

  const updated = await prisma.refund.update({
    where: { id: params.id },
    data: {
      status: 'approved',
      refunded_at: refundedAtDate,
      approved_by_id: user.id,
      approved_at: new Date(),
    },
  })

  // Badge tự cập nhật — invalidate layout cache để đếm lại phiếu pending
  revalidatePath('/finance')
  revalidatePath('/dashboard')

  return NextResponse.json({ ...updated, amount: Number(updated.amount) })
}
