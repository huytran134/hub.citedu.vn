import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const where = status ? { status: status as 'pending' | 'approved' | 'rejected' } : {}

  const refunds = await prisma.refund.findMany({
    where,
    include: {
      enrollment: {
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          class: {
            select: {
              id: true,
              name: true,
              program: { select: { name: true, branch: true } },
              homeroom: { select: { full_name: true } },
            },
          },
        },
      },
      created_by: { select: { full_name: true } },
      approved_by: { select: { full_name: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json(refunds.map((r) => ({ ...r, amount: Number(r.amount) })))
}
