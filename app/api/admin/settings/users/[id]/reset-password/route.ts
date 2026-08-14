import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { password } = body

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Mật khẩu tối thiểu 8 ký tự' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 12)

  try {
    await prisma.user.update({
      where: { id: params.id },
      data: { password_hash },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Đổi mật khẩu thất bại:', err)
    return NextResponse.json({ error: 'Lỗi đổi mật khẩu' }, { status: 500 })
  }
}
