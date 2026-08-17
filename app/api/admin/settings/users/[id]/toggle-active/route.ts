import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user: currentUser, response } = await requireAdmin()
  if (response) return response

  if (params.id === currentUser!.id) {
    return NextResponse.json({ error: 'Không thể tự vô hiệu hóa tài khoản của mình' }, { status: 403 })
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { is_active: !target.is_active },
  })

  return NextResponse.json({ user: updated })
}
