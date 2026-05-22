import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const users = await prisma.user.findMany({ orderBy: { created_at: 'asc' } })
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

  const supabase = createSupabaseAdminClient()

  // Bước 1: tạo Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    const msg = authError?.message ?? 'Lỗi tạo tài khoản'
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return NextResponse.json({ error: 'Email này đã được đăng ký' }, { status: 422 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Bước 2: tạo bản ghi User trong Prisma
  try {
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        full_name: full_name.trim(),
        role,
        phone: phone?.trim() || null,
      },
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    // Rollback Supabase Auth user nếu Prisma lỗi
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.error('Prisma create user failed, rolled back Supabase Auth user:', err)
    return NextResponse.json({ error: 'Lỗi lưu thông tin người dùng' }, { status: 500 })
  }
}
