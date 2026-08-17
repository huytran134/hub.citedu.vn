import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { response } = await requireHomeroom()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage') ?? ''
  const search = searchParams.get('search') ?? ''
  const assignedToId = searchParams.get('assigned_to_id') ?? ''
  const source = searchParams.get('source') ?? ''

  const stageFilter = stage ? { stage: { in: stage.split(',') as any[] } } : {}

  const where: Record<string, unknown> = {
    ...stageFilter,
    ...(assignedToId && { assigned_to_id: assignedToId }),
  }

  // Search theo tên hoặc SĐT contact
  if (search) {
    where.contact = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ],
    }
  } else if (source) {
    where.contact = { source }
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      contact: { select: { id: true, name: true, phone: true, source: true } },
      assigned_to: { select: { id: true, full_name: true } },
      // Lấy note mới nhất để hiện badge "Gọi lại"
      notes: {
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 1,
        select: {
          id: true,
          next_followup_at: true,
          contact_result: true,
          created_at: true,
        },
      },
      enrollments: {
        where: { deleted_at: null },
        select: { id: true, status: true },
        take: 1,
        orderBy: { created_at: 'desc' },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json(leads)
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { contact_id, assigned_to_id, interested_program_id, initial_note } = body

  if (!contact_id) {
    return NextResponse.json({ error: 'Vui lòng chọn Contact' }, { status: 400 })
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contact_id },
    select: { id: true },
  })
  if (!contact) {
    return NextResponse.json({ error: 'Không tìm thấy Contact' }, { status: 404 })
  }

  const lead = await prisma.lead.create({
    data: {
      contact_id,
      stage: 'new',
      ...(assigned_to_id && { assigned_to_id, assigned_at: new Date() }),
      ...(interested_program_id && { interested_program_id }),
      created_by_id: user!.id,
    },
    include: {
      contact: { select: { id: true, name: true, phone: true, source: true } },
      assigned_to: { select: { id: true, full_name: true } },
    },
  })

  // Tạo ghi chú đầu tiên nếu Admin nhập
  if (initial_note?.trim()) {
    await prisma.leadNote.create({
      data: {
        lead_id: lead.id,
        content: initial_note.trim(),
        contact_method: 'other',
        contact_result: 'answered',
        created_by_id: user!.id,
      },
    })
  }

  return NextResponse.json(lead, { status: 201 })
}
