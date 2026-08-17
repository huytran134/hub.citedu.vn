import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/utils'
import type { ContactSource, ContactStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const { response } = await requireHomeroom()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const source = searchParams.get('source') as ContactSource | ''
  const status = searchParams.get('status') as ContactStatus | ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    }),
    ...(source && { source }),
    ...(status && { status }),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        source: true,
        status: true,
        created_at: true,
        _count: {
          select: {
            // Middleware không áp dụng cho nested query → thêm deleted_at: null tường minh
            enrollments: { where: { status: { in: ['active', 'completed'] }, deleted_at: null } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ])

  return NextResponse.json({ contacts, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { name, phone, email, zalo_id, date_of_birth, address, gender, source, note } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 })
  if (!phone?.trim()) return NextResponse.json({ error: 'SĐT không được để trống' }, { status: 400 })
  if (!source) return NextResponse.json({ error: 'Vui lòng chọn nguồn' }, { status: 400 })

  const normalized = normalizePhone(phone)

  // Smart Match: kiểm tra SĐT kể cả soft-deleted — dùng $queryRaw để bypass middleware
  type PhoneRow = { id: string; name: string }
  const existing = await prisma.$queryRaw<PhoneRow[]>`
    SELECT id, name FROM contacts WHERE phone = ${normalized} LIMIT 1
  `
  if (existing.length > 0) {
    return NextResponse.json(
      { error: `SĐT này đã tồn tại — ${existing[0].name}`, contactId: existing[0].id },
      { status: 409 },
    )
  }

  const contact = await prisma.contact.create({
    data: {
      name: name.trim(),
      phone: normalized,
      email: email?.trim() || null,
      zalo_id: zalo_id?.trim() || null,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
      address: address?.trim() || null,
      gender: gender || null,
      source,
      created_by_id: user!.id,
      ...(note?.trim() && {
        notes: {
          create: { content: note.trim(), created_by_id: user!.id },
        },
      }),
    },
  })

  return NextResponse.json(contact, { status: 201 })
}
