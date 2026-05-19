import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { response } = await requireHomeroom()
  if (response) return response

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      contact: {
        select: {
          id: true, name: true, phone: true, source: true, status: true, email: true,
        },
      },
      assigned_to: { select: { id: true, full_name: true } },
      created_by: { select: { full_name: true } },
      // Middleware không lọc nested — phải tường minh deleted_at: null
      notes: {
        where: { deleted_at: null },
        include: { created_by: { select: { id: true, full_name: true } } },
        orderBy: { created_at: 'desc' },
      },
      enrollments: {
        where: { deleted_at: null },
        include: { class: { select: { id: true, name: true } } },
        orderBy: { created_at: 'desc' },
      },
    },
  })

  if (!lead) return NextResponse.json({ error: 'Không tìm thấy lead' }, { status: 404 })

  return NextResponse.json(lead)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { stage, assigned_to_id, lost_reason, lost_note } = body

  // Chuyển sang lost bắt buộc phải có lost_reason
  if (stage === 'lost' && !lost_reason) {
    return NextResponse.json(
      { error: 'Vui lòng chọn lý do không chốt' },
      { status: 400 },
    )
  }

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: {
      ...(stage !== undefined && { stage }),
      ...(assigned_to_id !== undefined && {
        assigned_to_id: assigned_to_id || null,
        ...(assigned_to_id && { assigned_at: new Date() }),
      }),
      ...(lost_reason !== undefined && { lost_reason }),
      ...(lost_note !== undefined && { lost_note: lost_note || null }),
    },
    include: {
      contact: { select: { id: true, name: true, phone: true, source: true } },
      assigned_to: { select: { id: true, full_name: true } },
    },
  })

  return NextResponse.json(lead)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, response } = await requireAdmin()
  if (response) return response

  await prisma.lead.update({
    where: { id: params.id },
    data: { deleted_at: new Date(), deleted_by_id: user!.id },
  })

  return NextResponse.json({ success: true })
}
