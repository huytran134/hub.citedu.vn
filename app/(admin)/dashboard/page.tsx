import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'

// Trả về chuỗi thân thiện — không cần date-fns
function formatRelativeDate(date: Date): string {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (date >= startOfToday) {
    const h = date.getHours().toString().padStart(2, '0')
    const m = date.getMinutes().toString().padStart(2, '0')
    return `Hôm nay lúc ${h}:${m}`
  }
  const diffDays = Math.ceil((startOfToday.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 1) return 'Hôm qua'
  return `${diffDays} ngày trước`
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-600',
  approved: 'bg-green-100 text-green-600',
  rejected: 'bg-red-100 text-red-600',
}

export default async function DashboardPage() {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  // Thứ Hai là đầu tuần (lịch Việt Nam)
  const dayOfWeek = now.getDay() // 0 = CN, 1 = T2, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday)

  const [
    pendingPaymentCount,
    pendingRefundCount,
    activeEnrollmentCount,
    weekLeadCount,
    allFollowups,
    activeEnrollmentsData,
    recentPayments,
  ] = await Promise.all([
    prisma.payment.count({ where: { status: 'pending' } }),
    prisma.refund.count({ where: { status: 'pending' } }),
    prisma.enrollment.count({ where: { status: 'active' } }),
    prisma.lead.count({ where: { created_at: { gte: startOfWeek } } }),

    // Lead cần gọi lại — distinct by lead_id (mỗi lead chỉ hiện 1 lần, note quá hạn nhất lên đầu)
    prisma.leadNote.findMany({
      where: {
        next_followup_at: { lte: endOfToday },
        lead: { stage: 'consulting' },
      },
      distinct: ['lead_id'],
      orderBy: { next_followup_at: 'asc' },
      include: {
        lead: {
          include: {
            contact: { select: { name: true, phone: true } },
            assigned_to: { select: { full_name: true } },
          },
        },
      },
    }),

    // Tổng công nợ — active + suspended (không tính dropped/completed)
    prisma.enrollment.findMany({
      where: { status: { in: ['active', 'suspended'] } },
      select: {
        agreed_price: true,
        payments: {
          // Middleware không áp dụng cho nested include → thêm deleted_at: null tường minh
          where: { status: 'approved', deleted_at: null },
          select: { amount: true },
        },
      },
    }),

    // 10 phiếu thu gần nhất (mọi status)
    prisma.payment.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        enrollment: {
          include: {
            contact: { select: { name: true } },
          },
        },
      },
    }),
  ])

  const totalFollowupCount = allFollowups.length
  const followups = allFollowups.slice(0, 10)

  const totalDebt = activeEnrollmentsData.reduce((sum, e) => {
    const paid = e.payments.reduce((s, p) => s + Number(p.amount), 0)
    return sum + Number(e.agreed_price) - paid
  }, 0)

  const pendingTotal = pendingPaymentCount + pendingRefundCount

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold text-ink mb-1 uppercase tracking-wide">Tổng quan</h1>
      <p className="text-gray-500 text-sm mb-6">
        {now.toLocaleDateString('vi-VN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      {/* KHU VỰC 1 — KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Phiếu chờ duyệt */}
        <Link
          href="/admin/finance/payments"
          className={`rounded-xl p-5 shadow-sm text-white transition-opacity hover:opacity-90 ${
            pendingTotal > 0 ? 'bg-flame' : 'bg-gray-300'
          }`}
        >
          <p className="text-sm opacity-80">Phiếu chờ duyệt</p>
          <p className="text-4xl font-bold mt-2">{pendingTotal}</p>
          <p className="text-xs opacity-70 mt-1.5">
            {pendingPaymentCount} thu · {pendingRefundCount} hoàn
          </p>
        </Link>

        {/* Card 2: Tổng công nợ */}
        <div
          className={`rounded-xl p-5 shadow-sm text-white ${
            totalDebt > 0 ? 'bg-amber-500' : 'bg-green-600'
          }`}
        >
          <p className="text-sm opacity-80">Tổng công nợ</p>
          <p className="text-xl font-bold mt-2 leading-tight break-words">{formatCurrency(totalDebt)}</p>
          <p className="text-xs opacity-70 mt-1.5">Active + bảo lưu</p>
        </div>

        {/* Card 3: Học viên đang học */}
        <Link
          href="/admin/classes"
          className="bg-navy rounded-xl p-5 shadow-sm text-white hover:opacity-90 transition-opacity"
        >
          <p className="text-sm opacity-80">Học viên đang học</p>
          <p className="text-4xl font-bold mt-2">{activeEnrollmentCount}</p>
          <p className="text-xs opacity-70 mt-1.5">Enrollment active</p>
        </Link>

        {/* Card 4: Lead mới tuần này */}
        <Link
          href="/admin/leads"
          className="bg-navy rounded-xl p-5 shadow-sm text-white hover:opacity-90 transition-opacity"
        >
          <p className="text-sm opacity-80">Lead mới tuần này</p>
          <p className="text-4xl font-bold mt-2">{weekLeadCount}</p>
          <p className="text-xs opacity-70 mt-1.5">Từ Thứ Hai</p>
        </Link>
      </div>

      {/* KHU VỰC 2 + 3 — 2/3 lead followup · 1/3 hoạt động gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* KHU VỰC 2 — Lead cần gọi lại hôm nay */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-ink flex items-center gap-2">
                <span>📞</span>
                Lead cần liên hệ hôm nay
                {totalFollowupCount > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalFollowupCount}
                  </span>
                )}
              </h2>
              {totalFollowupCount > 10 && (
                <Link href="/admin/leads" className="text-xs text-flame hover:underline flex-shrink-0">
                  Xem tất cả {totalFollowupCount} lead →
                </Link>
              )}
            </div>

            {followups.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-green-600 font-semibold">✓ Tất cả lead đã được theo dõi</p>
                <p className="text-sm text-gray-400 mt-1">Không có ai cần gọi hôm nay</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {followups.map((note) => {
                  const followupDate = note.next_followup_at!
                  const isOverdue = followupDate < startOfToday
                  return (
                    <Link
                      key={note.id}
                      href={`/admin/leads/${note.lead.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="font-medium text-ink truncate">{note.lead.contact.name}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {note.lead.contact.phone}
                          {note.lead.assigned_to && ` · TV: ${note.lead.assigned_to.full_name}`}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${
                          isOverdue
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        {formatRelativeDate(followupDate)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* KHU VỰC 3 — Hoạt động gần đây */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-ink">Hoạt động gần đây</h2>
            </div>

            {recentPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Chưa có phiếu thu nào
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {payment.enrollment.contact.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(payment.created_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-ink">
                          {formatCurrency(Number(payment.amount))}
                        </p>
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            PAYMENT_STATUS_COLOR[payment.status]
                          }`}
                        >
                          {PAYMENT_STATUS_LABEL[payment.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
