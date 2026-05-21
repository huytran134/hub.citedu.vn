import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const programs = await prisma.program.findMany({
    orderBy: [{ branch: 'asc' }, { level: 'asc' }, { created_at: 'desc' }],
  })

  return NextResponse.json(
    programs.map((p) => ({ ...p, price: Number(p.price) })),
  )
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
  const { name, description, branch, level, price, duration_days, sessions_count } = body

  if (!name || !branch || price === undefined || price === null) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc: name, branch, price' }, { status: 400 })
  }

  const sessionsNum = sessions_count != null ? Number(sessions_count) : null

  const program = await prisma.$transaction(async (tx) => {
    const created = await tx.program.create({
      data: {
        name,
        description: description || null,
        branch,
        level: level != null ? Number(level) : null,
        price: BigInt(price),
        duration_days: duration_days != null ? Number(duration_days) : null,
        sessions_count: sessionsNum,
        created_by_id: user.id,
      },
    })

    // Tự tạo N Lesson rỗng theo sessions_count để Admin nhập nội dung sau
    if (sessionsNum && sessionsNum > 0) {
      await tx.lesson.createMany({
        data: Array.from({ length: sessionsNum }, (_, i) => ({
          program_id: created.id,
          session_number: i + 1,
          title: `Buổi ${i + 1}`,
          created_by_id: user.id,
        })),
      })
    }

    return created
  })

  return NextResponse.json({ ...program, price: Number(program.price) }, { status: 201 })
}
