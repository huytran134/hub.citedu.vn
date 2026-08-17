import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// PATCH — CNL lưu ghi chú sau buổi học (notes field của ClassSession)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const session = await prisma.classSession.findUnique({
    where: { id: params.sessionId },
    include: { class: { select: { homeroom_id: true } } },
  })

  if (!session) {
    return NextResponse.json({ error: 'Không tìm thấy buổi học' }, { status: 404 })
  }

  if (user.role === 'HOMEROOM' && session.class.homeroom_id !== user.id) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
  }

  const body = await req.json()
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  const updated = await prisma.classSession.update({
    where: { id: params.sessionId },
    data: { notes },
    select: { id: true, notes: true },
  })

  return NextResponse.json(updated)
}
