import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const payments = await prisma.payment.findMany({
    where: { status: 'pending' },
    include: {
      enrollment: {
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          class: {
            select: {
              id: true,
              name: true,
              homeroom: { select: { full_name: true } },
            },
          },
        },
      },
      created_by: { select: { full_name: true } },
    },
    orderBy: { created_at: 'asc' }, // FIFO — duyệt theo thứ tự
  })

  return NextResponse.json(payments.map((p) => ({ ...p, amount: Number(p.amount) })))
}
