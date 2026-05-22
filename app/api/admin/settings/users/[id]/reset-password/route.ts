import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdminClient } from '@/lib/supabase'

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

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(params.id, { password })

  if (error) {
    return NextResponse.json({ error: 'Lỗi đổi mật khẩu: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
