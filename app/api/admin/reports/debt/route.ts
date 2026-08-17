import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  // Query tất cả Enrollment đang active hoặc suspended
  // Middleware soft-delete tự lọc Enrollment.deleted_at = null
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: { in: ['active', 'suspended'] },
    },
    include: {
      contact: { select: { name: true, phone: true } },
      class: {
        include: {
          program: { select: { name: true, branch: true } },
        },
      },
      // Lấy TẤT CẢ payment (mọi status) để hiển thị trong drawer
      // Phải thêm deleted_at: null thủ công vì middleware chỉ áp dụng top-level
      payments: {
        where: { deleted_at: null },
        include: {
          created_by: { select: { full_name: true } },
          approved_by: { select: { full_name: true } },
        },
        orderBy: { created_at: 'desc' },
      },
      refunds: {
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
      },
    },
    orderBy: { created_at: 'asc' },
  })

  // Tính công nợ từng enrollment — REALTIME, không lưu DB
  const rows = enrollments.map((e) => {
    const agreedPrice = Number(e.agreed_price)

    // Chỉ tính payment đã approved
    const totalPaid = e.payments
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    // Chỉ tính refund đã approved — phải trừ vào số đã thu
    const totalRefunded = e.refunds
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    // Số tiền thực công ty đang giữ (đã thu - đã hoàn)
    const netPaid = totalPaid - totalRefunded

    // Công nợ = học phí thỏa thuận - thực đã thu
    const debt = agreedPrice - netPaid

    return {
      enrollment_id: e.id,
      enrollment_status: e.status,
      contact_name: e.contact.name,
      contact_phone: e.contact.phone,
      class_id: e.class_id,
      class_name: e.class.name,
      program_name: e.class.program.name,
      program_branch: e.class.program.branch,
      agreed_price: agreedPrice,
      total_paid: totalPaid,
      total_refunded: totalRefunded,
      net_paid: netPaid,
      debt,
      // Lịch sử chi tiết cho drawer — tất cả trạng thái
      payments: e.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        paid_at: p.paid_at?.toISOString() ?? null,
        created_at: p.created_at.toISOString(),
        approved_at: p.approved_at?.toISOString() ?? null,
        rejection_reason: p.rejection_reason,
        note: p.note,
        creator_name: p.created_by.full_name,
        approver_name: p.approved_by?.full_name ?? null,
      })),
      refunds: e.refunds.map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        reason: r.reason,
        status: r.status,
        refunded_at: r.refunded_at?.toISOString() ?? null,
        created_at: r.created_at.toISOString(),
      })),
    }
  })

  // Sắp xếp: nợ nhiều nhất lên đầu
  rows.sort((a, b) => b.debt - a.debt)

  // Tổng quan toàn hệ thống — tính realtime
  const totalDebt = rows.filter((r) => r.debt > 0).reduce((sum, r) => sum + r.debt, 0)
  const debtorCount = rows.filter((r) => r.debt > 0).length
  const totalNetCollected = rows.reduce((sum, r) => sum + r.net_paid, 0)

  // Danh sách lớp để filter client-side
  const classOptions = Array.from(
    new Map(rows.map((r) => [r.class_id, r.class_name])).entries(),
  ).map(([id, name]) => ({ id, name }))

  return NextResponse.json({
    summary: { totalDebt, debtorCount, totalNetCollected },
    rows,
    classOptions,
  })
}
