import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/utils'

// Smart Match: kiểm tra SĐT có tồn tại không (kể cả soft-deleted)
export async function GET(request: NextRequest) {
  const { response } = await requireHomeroom()
  if (response) return response

  const phone = request.nextUrl.searchParams.get('phone') ?? ''
  if (!phone) return NextResponse.json({ exists: false })

  const normalized = normalizePhone(phone)

  type PhoneRow = { id: string; name: string }
  const rows = await prisma.$queryRaw<PhoneRow[]>`
    SELECT id, name FROM contacts WHERE phone = ${normalized} LIMIT 1
  `

  if (rows.length === 0) return NextResponse.json({ exists: false })
  return NextResponse.json({ exists: true, contact: { id: rows[0].id, name: rows[0].name } })
}
