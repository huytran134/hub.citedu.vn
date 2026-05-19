import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const body = await request.json()
  const { content, contact_method, contact_result, next_followup_at } = body

  // Lấy note để kiểm tra quyền sửa
  const existing = await prisma.leadNote.findFirst({
    where: { id: params.noteId, lead_id: params.id, deleted_at: null },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Không tìm thấy ghi chú' }, { status: 404 })
  }

  // CNL chỉ được sửa ghi chú của chính mình
  if (user!.role !== 'ADMIN' && existing.created_by_id !== user!.id) {
    return NextResponse.json({ error: 'Không có quyền sửa ghi chú này' }, { status: 403 })
  }

  const note = await prisma.leadNote.update({
    where: { id: params.noteId },
    data: {
      ...(content !== undefined && { content: content.trim() }),
      ...(contact_method !== undefined && { contact_method }),
      ...(contact_result !== undefined && { contact_result }),
      ...(contact_result === 'callback_needed' && next_followup_at !== undefined
        ? { next_followup_at: next_followup_at ? new Date(next_followup_at) : null }
        : contact_result && contact_result !== 'callback_needed'
          ? { next_followup_at: null }
          : {}),
    },
    include: { created_by: { select: { id: true, full_name: true } } },
  })

  return NextResponse.json(note)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; noteId: string } },
) {
  const { user, response } = await requireAdmin()
  if (response) return response

  await prisma.leadNote.update({
    where: { id: params.noteId },
    data: { deleted_at: new Date(), deleted_by_id: user!.id },
  })

  return NextResponse.json({ success: true })
}
