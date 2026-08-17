import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/utils'
import type { ContactSource } from '@prisma/client'

type ImportRow = {
  name: string
  phone: string
  source: string
  email?: string | null
  note?: string | null
}

type ConflictEntry = {
  phone: string
  file: { name: string; email?: string | null; source: string }
  db: { id: string; name: string; email?: string | null; source: string }
  diff: string[]
}

type DbRow = {
  id: string
  name: string
  email: string | null
  source: string
}

const VALID_SOURCES: ContactSource[] = [
  'facebook', 'website', 'hys', 'referral', 'event', 'other',
]

function normalizeSource(raw: string): ContactSource {
  const s = raw.toLowerCase().trim()
  if (s === 'facebook' || s === 'fb') return 'facebook'
  if (s === 'website' || s === 'web') return 'website'
  if (s.includes('hys')) return 'hys'
  if (s === 'giới thiệu' || s === 'referral' || s === 'gt' || s === 'gioi thieu') return 'referral'
  if (s === 'sự kiện' || s === 'event' || s === 'su kien' || s === 'sk') return 'event'
  if (VALID_SOURCES.includes(s as ContactSource)) return s as ContactSource
  return 'other'
}

function isSameValue(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (v: string | null | undefined) => (v ?? '').toLowerCase().trim()
  return norm(a) === norm(b)
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAdmin()
  if (response) return response

  let rows: ImportRow[]
  try {
    rows = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Không có dòng dữ liệu nào' }, { status: 400 })
  }

  // Validate tối đa 2000 dòng/lần import
  if (rows.length > 2000) {
    return NextResponse.json({ error: 'Tối đa 2000 dòng mỗi lần import' }, { status: 400 })
  }

  let created = 0
  let skipped = 0
  const conflicts: ConflictEntry[] = []

  for (const row of rows) {
    const rawPhone = row.phone ?? ''
    if (!rawPhone.trim()) continue // Bỏ qua dòng không có SĐT

    const phone = normalizePhone(rawPhone)
    const name = row.name?.trim() ?? ''
    if (!name) continue // Bỏ qua dòng không có tên

    const source = normalizeSource(row.source ?? '')
    const email = row.email?.trim() || null

    // Smart Match — dùng $queryRaw để bypass soft-delete middleware
    // (Kiểm tra cả soft-deleted vì UNIQUE constraint trên cột phone vẫn còn)
    const existing = await prisma.$queryRaw<DbRow[]>`
      SELECT id, name, email, source FROM contacts WHERE phone = ${phone} LIMIT 1
    `

    if (existing.length === 0) {
      // NEW — tạo Contact mới
      await prisma.contact.create({
        data: {
          name,
          phone,
          source,
          email,
          created_by_id: user!.id,
          ...(row.note?.trim() && {
            notes: {
              create: { content: row.note.trim(), created_by_id: user!.id },
            },
          }),
        },
      })
      created++
      continue
    }

    const db = existing[0]
    const diff: string[] = []

    // So sánh các field có trong file với DB
    if (!isSameValue(name, db.name)) diff.push('name')
    if (row.email !== undefined && !isSameValue(email, db.email)) diff.push('email')
    if (row.source && !isSameValue(source, db.source)) diff.push('source')

    if (diff.length === 0) {
      // DUPLICATE — data giống hệt, bỏ qua
      skipped++
    } else {
      // CONFLICT — SĐT đã có nhưng có field khác, giữ nguyên DB
      conflicts.push({
        phone,
        file: { name, email, source },
        db: { id: db.id, name: db.name, email: db.email, source: db.source },
        diff,
      })
    }
  }

  return NextResponse.json({ created, skipped, conflicts })
}
