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
  const { suspended_reason, suspended_at, suspended_until } = body

  if (!suspended_reason?.trim()) {
    return NextResponse.json({ error: 'Lý do bảo lưu là bắt buộc' }, { status: 400 })
  }
  if (!suspended_at || !suspended_until) {
    return NextResponse.json({ error: 'Ngày bảo lưu là bắt buộc' }, { status: 400 })
  }

  const suspendedAt = new Date(suspended_at)
  const suspendedUntil = new Date(suspended_until)

  const maxUntil = new Date(suspendedAt)
  maxUntil.setMonth(maxUntil.getMonth() + 36)
  if (suspendedUntil > maxUntil) {
    return NextResponse.json({ error: 'Thời gian bảo lưu tối đa là 36 tháng' }, { status: 400 })
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id: params.id } })
  if (!enrollment) {
    return NextResponse.json({ error: 'Không tìm thấy học viên' }, { status: 404 })
  }
  if (enrollment.status !== 'active') {
    return NextResponse.json(
      { error: 'Chỉ học viên đang active mới được bảo lưu' },
      { status: 400 },
    )
  }

  const updated = await prisma.enrollment.update({
    where: { id: params.id },
    data: {
      status: 'suspended',
      suspended_at: suspendedAt,
      suspended_until: suspendedUntil,
      suspended_reason: suspended_reason.trim(),
    },
    select: { id: true, status: true, suspended_until: true },
  })

  return NextResponse.json(updated)
}
