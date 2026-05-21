import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin()
  if (response) return response

  const lessons = await prisma.lesson.findMany({
    where: { program_id: params.id },
    include: {
      created_by: { select: { full_name: true } },
      _count: { select: { versions: true } },
    },
    orderBy: { session_number: 'asc' },
  })

  return NextResponse.json(lessons)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
  const { session_number, title, objectives } = body

  if (!session_number || !title) {
    return NextResponse.json({ error: 'Thiếu session_number hoặc title' }, { status: 400 })
  }

  const existing = await prisma.lesson.findUnique({
    where: { program_id_session_number: { program_id: params.id, session_number: Number(session_number) } },
  })
  if (existing) {
    return NextResponse.json({ error: `Buổi ${session_number} đã tồn tại trong chương trình này` }, { status: 409 })
  }

  const lesson = await prisma.lesson.create({
    data: {
      program_id: params.id,
      session_number: Number(session_number),
      title,
      objectives: objectives || null,
      created_by_id: user.id,
    },
  })

  return NextResponse.json(lesson, { status: 201 })
}
