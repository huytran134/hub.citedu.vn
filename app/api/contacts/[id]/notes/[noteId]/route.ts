import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const note = await prisma.contactNote.findUnique({
    where: { id: params.noteId },
    select: { id: true, contact_id: true, created_by_id: true },
  })

  if (!note || note.contact_id !== params.id) {
    return NextResponse.json({ error: 'Không tìm thấy ghi chú' }, { status: 404 })
  }

  // CNL chỉ được sửa ghi chú của chính mình
  if (user!.role === 'HOMEROOM' && note.created_by_id !== user!.id) {
    return NextResponse.json({ error: 'Không có quyền sửa ghi chú này' }, { status: 403 })
  }

  const { content } = await request.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Nội dung không được để trống' }, { status: 400 })
  }

  const updated = await prisma.contactNote.update({
    where: { id: params.noteId },
    data: { content: content.trim() },
    include: { created_by: { select: { id: true, full_name: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; noteId: string } },
) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const note = await prisma.contactNote.findUnique({
    where: { id: params.noteId },
    select: { id: true, contact_id: true },
  })

  if (!note || note.contact_id !== params.id) {
    return NextResponse.json({ error: 'Không tìm thấy ghi chú' }, { status: 404 })
  }

  await prisma.contactNote.update({
    where: { id: params.noteId },
    data: { deleted_at: new Date(), deleted_by_id: user!.id },
  })

  return NextResponse.json({ success: true })
}
