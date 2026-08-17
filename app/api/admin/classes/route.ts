import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const classes = await prisma.class.findMany({
    include: {
      program: { select: { name: true, branch: true, price: true } },
      homeroom: { select: { id: true, full_name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json(
    classes.map((c) => ({
      ...c,
      program: { ...c.program, price: Number(c.program.price) },
    })),
  )
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
  const { program_id, name, format, homeroom_id, start_date, end_date, location, zoom_link, max_students } = body

  if (!program_id || !name) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc: program_id, name' }, { status: 400 })
  }

  const program = await prisma.program.findUnique({ where: { id: program_id } })
  if (!program) return NextResponse.json({ error: 'Chương trình không tồn tại' }, { status: 404 })

  const cls = await prisma.class.create({
    data: {
      program_id,
      name,
      format: format || 'offline',
      homeroom_id: homeroom_id || null,
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      location: location || null,
      zoom_link: zoom_link || null,
      max_students: max_students ? Number(max_students) : 30,
      created_by_id: user.id,
    },
  })

  return NextResponse.json(cls, { status: 201 })
}
