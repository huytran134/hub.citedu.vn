import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
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

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const users = await prisma.user.findMany({
    orderBy: { created_at: 'asc' },
    select: SAFE_USER_SELECT,
  })
  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { full_name, email, password, role, phone } = body

  if (!full_name?.trim()) return NextResponse.json({ error: 'Vui lòng nhập họ tên' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'Vui lòng nhập email' }, { status: 400 })
  if (!password || password.length < 8) return NextResponse.json({ error: 'Mật khẩu tối thiểu 8 ký tự' }, { status: 400 })
  if (role !== 'ADMIN' && role !== 'HOMEROOM') return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (existing) {
    return NextResponse.json({ error: 'Email này đã được đăng ký' }, { status: 422 })
  }

  const password_hash = await bcrypt.hash(password, 12)

  try {
    const user = await prisma.user.create({
      data: {
        email: email.trim(),
        password_hash,
        full_name: full_name.trim(),
        role,
        phone: phone?.trim() || null,
      },
      select: SAFE_USER_SELECT,
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    console.error('Tạo user thất bại:', err)
    return NextResponse.json({ error: 'Lỗi lưu thông tin người dùng' }, { status: 500 })
  }
}
