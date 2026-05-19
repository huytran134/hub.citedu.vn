import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const { content } = await request.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Nội dung ghi chú không được để trống' }, { status: 400 })
  }

  const note = await prisma.contactNote.create({
    data: {
      contact_id: params.id,
      content: content.trim(),
      created_by_id: user!.id,
    },
    include: { created_by: { select: { id: true, full_name: true } } },
  })

  return NextResponse.json(note, { status: 201 })
}
