import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  // ?status=pending|approved|rejected — mặc định pending
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'
  const validStatuses = ['pending', 'approved', 'rejected']
  const statusFilter = validStatuses.includes(status) ? status : 'pending'

  const payments = await prisma.payment.findMany({
    where: { status: statusFilter as 'pending' | 'approved' | 'rejected' },
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
      approved_by: { select: { full_name: true } },
    },
    orderBy: statusFilter === 'pending'
      ? { created_at: 'asc' }  // FIFO — duyệt cũ trước
      : { updated_at: 'desc' }, // Lịch sử — mới nhất trước
    take: 100, // giới hạn để tránh load quá nhiều lịch sử
  })

  return NextResponse.json(payments.map((p) => ({ ...p, amount: Number(p.amount) })))
}
