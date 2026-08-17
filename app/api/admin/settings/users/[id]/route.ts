import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// Chỉ chọn các field an toàn để trả ra client — KHÔNG BAO GIỜ include password_hash
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  is_active: true,
  phone: true,
  avatar_url: true,
  created_at: true,
  updated_at: true,
} as const

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { full_name, role, phone } = body

  if (!full_name?.trim()) return NextResponse.json({ error: 'Vui lòng nhập họ tên' }, { status: 400 })
  if (role !== 'ADMIN' && role !== 'HOMEROOM') return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      full_name: full_name.trim(),
      role,
      phone: phone?.trim() || null,
    },
    select: SAFE_USER_SELECT,
  })

  return NextResponse.json({ user: updated })
}
