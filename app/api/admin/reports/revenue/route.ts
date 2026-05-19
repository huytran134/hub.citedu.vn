import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import type { ProgramBranch } from '@prisma/client'

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const classId = searchParams.get('classId') || undefined
  const branch = searchParams.get('branch') || undefined

  // Mặc định: từ ngày 1 tháng này đến hôm nay
  const now = new Date()
  const fromDate = from
    ? new Date(from + 'T00:00:00.000Z')
    : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const toDate = to
    ? new Date(to + 'T23:59:59.999Z')
    : new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999))

  // Build filter cho enrollment (lớp + nhánh)
  const enrollmentWhere: Record<string, unknown> = {}
  if (classId) enrollmentWhere.class_id = classId
  if (branch) enrollmentWhere.class = { program: { branch: branch as ProgramBranch } }

  const [payments, classes] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: 'approved',
        paid_at: { gte: fromDate, lte: toDate },
        ...(Object.keys(enrollmentWhere).length > 0 ? { enrollment: enrollmentWhere } : {}),
      },
      include: {
        enrollment: {
          include: {
            contact: { select: { name: true, phone: true } },
            class: {
              include: {
                program: { select: { name: true, branch: true } },
              },
            },
          },
        },
      },
      orderBy: { paid_at: 'asc' },
    }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { created_at: 'desc' },
    }),
  ])

  // Chuyển BigInt → Number trước khi serialize JSON
  const serialized = payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    method: p.method,
    paid_at: p.paid_at?.toISOString() ?? null,
    enrollment_id: p.enrollment_id,
    contact_name: p.enrollment.contact.name,
    contact_phone: p.enrollment.contact.phone,
    class_name: p.enrollment.class.name,
    class_id: p.enrollment.class_id,
    program_name: p.enrollment.class.program.name,
    program_branch: p.enrollment.class.program.branch,
  }))

  // Tổng quan — tính realtime, không lưu DB
  const totalAmount = serialized.reduce((sum, p) => sum + p.amount, 0)
  const totalPayments = serialized.length
  const distinctEnrollments = new Set(serialized.map((p) => p.enrollment_id)).size
  const avgPerPayment = totalPayments > 0 ? Math.round(totalAmount / totalPayments) : 0

  return NextResponse.json({
    summary: { totalAmount, totalPayments, distinctEnrollments, avgPerPayment },
    payments: serialized,
    classes,
  })
}
