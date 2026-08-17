import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { response } = await requireAdmin()
  if (response) return response

  const enrollment = await prisma.enrollment.findUnique({ where: { id: params.id } })
  if (!enrollment) {
    return NextResponse.json({ error: 'Không tìm thấy học viên' }, { status: 404 })
  }
  if (enrollment.status !== 'suspended') {
    return NextResponse.json(
      { error: 'Chỉ học viên đang bảo lưu mới được kích hoạt lại' },
      { status: 400 },
    )
  }

  const updated = await prisma.enrollment.update({
    where: { id: params.id },
    data: {
      status: 'active',
      suspended_at: null,
      suspended_until: null,
      suspended_reason: null,
    },
    select: { id: true, status: true },
  })

  return NextResponse.json(updated)
}
