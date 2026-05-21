import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, rating_teacher, rating_assistant, rating_organization, other_notes } = body

  const ratings = [rating_teacher, rating_assistant, rating_organization]
  if (!ratings.every((r) => Number.isInteger(r) && r >= 1 && r <= 5)) {
    return NextResponse.json({ error: 'Vui lòng đánh giá đầy đủ (1–5 sao).' }, { status: 400 })
  }

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token không hợp lệ.' }, { status: 400 })
  }

  const link = await prisma.magicLink.findUnique({
    where: { token },
  })

  if (!link || link.context !== 'evaluation') {
    return NextResponse.json({ error: 'Link không hợp lệ.' }, { status: 404 })
  }
  if (link.used_at) {
    return NextResponse.json({ error: 'Link này đã được sử dụng.' }, { status: 409 })
  }
  if (link.expires_at < new Date()) {
    return NextResponse.json({ error: 'Link đã hết hạn.' }, { status: 410 })
  }
  if (!link.session_id) {
    return NextResponse.json({ error: 'Link không gắn với buổi học.' }, { status: 400 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    null

  await prisma.$transaction([
    prisma.feedback.create({
      data: {
        session_id: link.session_id,
        contact_id: link.contact_id,
        rating_teacher,
        rating_assistant,
        rating_organization,
        other_notes: other_notes?.trim() || null,
        ip_address: ip,
      },
    }),
    prisma.magicLink.update({
      where: { token },
      data: { used_at: new Date() },
    }),
  ])

  return NextResponse.json({ success: true })
}
