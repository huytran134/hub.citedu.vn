import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
  const { rejection_reason } = body

  if (!rejection_reason?.trim()) {
    return NextResponse.json({ error: 'Bắt buộc nhập lý do từ chối' }, { status: 400 })
  }

  const payment = await prisma.payment.findUnique({ where: { id: params.id } })
  if (!payment) return NextResponse.json({ error: 'Không tìm thấy phiếu thu' }, { status: 404 })

  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'Phiếu thu đã được xử lý trước đó' }, { status: 400 })
  }

  const updated = await prisma.payment.update({
    where: { id: params.id },
    data: {
      status: 'rejected',
      rejection_reason: rejection_reason.trim(),
    },
  })

  // Badge tự cập nhật — invalidate layout cache để đếm lại phiếu pending
  revalidatePath('/finance')
  revalidatePath('/dashboard')

  return NextResponse.json({ ...updated, amount: Number(updated.amount) })
}
