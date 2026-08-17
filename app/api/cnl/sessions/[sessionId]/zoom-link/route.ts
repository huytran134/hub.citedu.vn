import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// PATCH — Cập nhật link Zoom/Meet cho buổi học (auto-save khi blur)
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
  const zoomLink = typeof body.zoom_link === 'string' ? body.zoom_link.trim() || null : null

  const updated = await prisma.classSession.update({
    where: { id: params.sessionId },
    data: { session_zoom_link: zoomLink },
    select: { id: true, session_zoom_link: true },
  })

  return NextResponse.json(updated)
}
