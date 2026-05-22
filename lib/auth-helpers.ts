import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from './supabase'
import { prisma } from './prisma'
import type { User } from '@prisma/client'

// Lấy user hiện tại: xác thực qua Supabase session + lấy profile từ DB
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    return await prisma.user.findUnique({ where: { id: user.id } })
  } catch (err) {
    console.error('getCurrentUser failed:', err)
    return null
  }
}

type AuthSuccess = { user: User; response: null }
type AuthError = { user: null; response: NextResponse }
type AuthResult = AuthSuccess | AuthError

// Dùng ở đầu MỌI API route trong (admin)/ — không exception
// Trả về { user } nếu hợp lệ, hoặc { response: 401/403 } nếu không có quyền
export async function requireAdmin(): Promise<AuthResult> {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }),
    }
  }

  if (!user.is_active) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hóa' }, { status: 403 }),
    }
  }

  if (user.role !== 'ADMIN') {
    return {
      user: null,
      response: NextResponse.json({ error: 'Chỉ Admin mới có quyền thực hiện' }, { status: 403 }),
    }
  }

  return { user, response: null }
}

// Dùng ở đầu MỌI API route trong (cnl)/ — không exception
// Cho phép cả ADMIN và HOMEROOM (CNL)
export async function requireHomeroom(): Promise<AuthResult> {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }),
    }
  }

  if (!user.is_active) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hóa' }, { status: 403 }),
    }
  }

  if (user.role !== 'ADMIN' && user.role !== 'HOMEROOM') {
    return {
      user: null,
      response: NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 }),
    }
  }

  return { user, response: null }
}
