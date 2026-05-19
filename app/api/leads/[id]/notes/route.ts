import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const body = await request.json()
  const { content, contact_method, contact_result, next_followup_at } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Nội dung ghi chú không được để trống' }, { status: 400 })
  }
  if (!contact_method) {
    return NextResponse.json({ error: 'Vui lòng chọn hình thức liên hệ' }, { status: 400 })
  }
  if (!contact_result) {
    return NextResponse.json({ error: 'Vui lòng chọn kết quả liên hệ' }, { status: 400 })
  }

  // Kiểm tra lead tồn tại
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    select: { id: true },
  })
  if (!lead) {
    return NextResponse.json({ error: 'Không tìm thấy lead' }, { status: 404 })
  }

  const note = await prisma.leadNote.create({
    data: {
      lead_id: params.id,
      content: content.trim(),
      contact_method,
      contact_result,
      // next_followup_at chỉ có ý nghĩa khi result = callback_needed
      ...(contact_result === 'callback_needed' && next_followup_at
        ? { next_followup_at: new Date(next_followup_at) }
        : {}),
      created_by_id: user!.id,
    },
    include: { created_by: { select: { id: true, full_name: true } } },
  })

  return NextResponse.json(note, { status: 201 })
}
