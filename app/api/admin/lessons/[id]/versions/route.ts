import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin()
  if (response) return response

  const versions = await prisma.lessonVersion.findMany({
    where: { lesson_id: params.id },
    include: {
      created_by: { select: { full_name: true } },
    },
    orderBy: { version_number: 'desc' },
  })

  return NextResponse.json(versions)
}
