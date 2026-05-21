export const dynamic = 'force-dynamic'

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

function timeAgo(dateInput: Date | null): string {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  let interval = seconds / 86400
  if (interval >= 1) return Math.floor(interval) + ' ngày trước'
  interval = seconds / 3600
  if (interval >= 1) return Math.floor(interval) + ' giờ trước'
  interval = seconds / 60
  if (interval >= 1) return Math.floor(interval) + ' phút trước'
  return 'vừa xong'
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

// 3 mức cảnh báo công nợ — Design System CLAUDE.md §6.2
// green = tốt (không nợ) · amber = cần chú ý · red = cần xử lý ngay
function getDebtCardStyle(debt: number): { bg: string; label: string } {
  if (debt <= 0) {
    return { bg: 'bg-green-600', label: 'Không có nợ' }
  }
  if (debt < 50_000_000) {
    return { bg: 'bg-amber-500', label: 'Cần thu' }
  }
  return { bg: 'bg-red-600', label: 'Cần xử lý' }
}

export default async function DashboardPage() {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  // Thứ Hai là đầu tuần (lịch Việt Nam)
  const dayOfWeek = now.getDay() // 0 = CN, 1 = T2, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  // Khoảng thời gian tuần này và tuần trước
  const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday)
  const startOfLastWeek = new Date(startOfThisWeek.getFullYear(), startOfThisWeek.getMonth(), startOfThisWeek.getDate() - 7)
  const endOfLastWeek = new Date(startOfThisWeek) // = start of this week (00:00)
  // Khoảng thời gian tháng này và tháng trước — dùng paid_at (CLAUDE.md §4.6)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [
    pendingPaymentCount,
    pendingRefundCount,
    activeEnrollmentCount,
    thisWeekLeadCount,
    lastWeekLeadCount,
    allFollowups,
    activeEnrollmentsData,
    recentPayments,
    thisMonthPayments,
    prevMonthPayments,
    activeClassCount,
    expiringSoon,
  ] = await Promise.all([
    prisma.payment.count({ where: { status: 'pending' } }),
    prisma.refund.count({ where: { status: 'pending' } }),
    prisma.enrollment.count({ where: { status: 'active' } }),
    prisma.lead.count({ where: { created_at: { gte: startOfThisWeek }, deleted_at: null } }),
    prisma.lead.count({ where: { created_at: { gte: startOfLastWeek, lt: endOfLastWeek }, deleted_at: null } }),

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

    // 5 phiếu thu được duyệt gần nhất (chỉ approved)
    prisma.payment.findMany({
      where: { status: 'approved', deleted_at: null },
      orderBy: { approved_at: 'desc' },
      take: 5,
      include: {
        enrollment: {
          include: {
            contact: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
    }),

    // Doanh thu tháng này — dùng paid_at (ngày tiền thực nhận), KHÔNG dùng created_at
    prisma.payment.findMany({
      where: {
        status: 'approved',
        paid_at: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { amount: true },
    }),

    // Doanh thu tháng trước — để tính delta %
    prisma.payment.findMany({
      where: {
        status: 'approved',
        paid_at: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
      select: { amount: true },
    }),

    // Lớp đang hoạt động
    prisma.class.count({
      where: { status: 'active', deleted_at: null },
    }),

    // Bảo lưu sắp hết hạn — trong vòng 30 ngày tới
    prisma.enrollment.findMany({
      where: {
        status: 'suspended',
        suspended_until: { gte: now, lte: in30Days },
      },
      orderBy: { suspended_until: 'asc' },
      include: {
        contact: { select: { name: true, phone: true } },
        class: { select: { name: true } },
      },
    }),
  ])

  const totalFollowupCount = allFollowups.length
  const followups = allFollowups.slice(0, 10)

  const totalDebt = activeEnrollmentsData.reduce((sum, e) => {
    const paid = e.payments.reduce((s, p) => s + Number(p.amount), 0)
    return sum + Number(e.agreed_price) - paid
  }, 0)

  // Dự thu = tổng giá trị thỏa thuận trừ đi số tiền đã trả của học viên đang học/bảo lưu
  // Dùng Math.max(0, ...) để tránh số âm nếu overpaid
  const duThu = activeEnrollmentsData.reduce((sum, e) => {
    const paid = e.payments.reduce((s, p) => s + Number(p.amount), 0)
    return sum + Math.max(0, Number(e.agreed_price) - paid)
  }, 0)

  const pendingTotal = pendingPaymentCount + pendingRefundCount

  // Doanh thu thực thu — chỉ tính approved + dùng paid_at (CLAUDE.md Red Line §4)
  const revenueThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const revenuePrevMonth = prevMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Delta % so với tháng trước
  const revenueDelta =
    revenuePrevMonth === 0
      ? null // Tháng đầu tiên — không có tháng trước để so sánh
      : ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100

  // Label tháng hiện tại — dynamic
  const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`
  const prevMonthLabel = `tháng ${now.getMonth() === 0 ? 12 : now.getMonth()}`

  // Delta Lead
  const leadDelta = thisWeekLeadCount - lastWeekLeadCount
  const leadDateLabel = `Từ ${startOfThisWeek.getDate().toString().padStart(2, '0')}/${(startOfThisWeek.getMonth() + 1).toString().padStart(2, '0')}`

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

      {/* HÀNG 1 — KPI TÀI CHÍNH */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Card 1: Doanh thu tháng này */}
        <Link
          href="/reports/revenue"
          className="relative bg-navy rounded-xl p-5 shadow-sm text-white hover:opacity-90 transition-opacity flex flex-col"
        >
          <span className="absolute top-4 right-4 opacity-60 text-lg leading-none">›</span>
          <p className="text-sm opacity-80 pr-5">Doanh thu tháng này</p>
          <p className="text-xl font-bold mt-2 leading-tight break-words">
            {formatCurrency(revenueThisMonth)}
          </p>
          {/* Delta so với tháng trước */}
          {revenueDelta === null ? (
            <p className="text-xs opacity-60 mt-1.5">Tháng đầu tiên</p>
          ) : (
            <p
              className={`text-xs font-semibold mt-1.5 ${
                revenueDelta >= 0 ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {revenueDelta >= 0 ? '+' : ''}{revenueDelta.toFixed(1)}% so với {prevMonthLabel}
            </p>
          )}
          <p className="text-xs opacity-50 mt-0.5">{monthLabel}</p>
        </Link>

        {/* Card 2: Dự thu */}
        <div className={`rounded-xl p-5 shadow-sm text-white ${duThu > 0 ? 'bg-amber-500' : 'bg-gray-400'}`}>
          <p className="text-sm opacity-80">Dự thu</p>
          <p className="text-xl font-bold mt-2 leading-tight break-words">
            {formatCurrency(duThu)}
          </p>
          <p className="text-xs font-semibold opacity-90 mt-1.5">Còn cần thu</p>
        </div>

        {/* Card 3: Tổng công nợ */}
        {(() => {
          const debtStyle = getDebtCardStyle(totalDebt)
          return (
            <div className={`rounded-xl p-5 shadow-sm text-white ${debtStyle.bg}`}>
              <p className="text-sm opacity-80">Tổng công nợ</p>
              <p className="text-xl font-bold mt-2 leading-tight break-words">
                {formatCurrency(totalDebt)}
              </p>
              <p className="text-xs font-semibold opacity-90 mt-1.5">{debtStyle.label}</p>
            </div>
          )
        })()}

        {/* Card 4: Phiếu chờ duyệt */}
        {pendingTotal > 0 ? (
          <Link
            href="/finance/payments"
            className="relative rounded-xl p-5 shadow-sm text-white bg-flame hover:opacity-90 transition-opacity flex flex-col"
          >
            <span className="absolute top-4 right-4 opacity-70 text-lg leading-none">›</span>
            <p className="text-sm opacity-80 pr-5">Phiếu chờ duyệt</p>
            <p className="text-4xl font-bold mt-2">{pendingTotal}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  pendingPaymentCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-white/20 text-white'
                }`}
              >
                {pendingPaymentCount} thu
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  pendingRefundCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-white/20 text-white'
                }`}
              >
                {pendingRefundCount} hoàn
              </span>
            </div>
            <p className="text-xs font-medium opacity-80 mt-2 underline underline-offset-2">
              Xem {pendingTotal} phiếu chờ →
            </p>
          </Link>
        ) : (
          <div className="rounded-xl p-5 shadow-sm text-white bg-gray-300">
            <p className="text-sm opacity-80">Phiếu chờ duyệt</p>
            <p className="text-4xl font-bold mt-2">0</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                0 thu
              </span>
              <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                0 hoàn
              </span>
            </div>
          </div>
        )}
      </div>

      {/* HÀNG 2 — KPI VẬN HÀNH */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Card 1: Lớp đang hoạt động */}
        <Link
          href="/classes"
          className="bg-navy rounded-xl p-5 shadow-sm text-white hover:opacity-90 transition-opacity flex items-center justify-between"
        >
          <div>
            <p className="text-sm opacity-80">Lớp học</p>
            <p className="text-3xl font-bold mt-1">{activeClassCount}</p>
            <p className="text-xs opacity-70 mt-1">Đang chạy</p>
          </div>
          <span className="opacity-60 text-2xl">›</span>
        </Link>

        {/* Card 2: Học viên đang học */}
        <Link
          href="/classes"
          className="bg-navy rounded-xl p-5 shadow-sm text-white hover:opacity-90 transition-opacity flex items-center justify-between"
        >
          <div>
            <p className="text-sm opacity-80">Học viên active</p>
            <p className="text-3xl font-bold mt-1">{activeEnrollmentCount}</p>
            <p className="text-xs opacity-70 mt-1">Tổng số</p>
          </div>
          <span className="opacity-60 text-2xl">›</span>
        </Link>

        {/* Card 3: Lead mới tuần này */}
        <Link
          href="/leads"
          className="bg-navy rounded-xl p-5 shadow-sm text-white hover:opacity-90 transition-opacity flex items-center justify-between"
        >
          <div>
            <p className="text-sm opacity-80">Lead mới</p>
            <p className="text-3xl font-bold mt-1">{thisWeekLeadCount}</p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {leadDelta > 0 && <span className="text-xs font-semibold text-green-400">+{leadDelta}</span>}
              {leadDelta < 0 && <span className="text-xs font-semibold text-red-400">{leadDelta}</span>}
              {leadDelta === 0 && <span className="text-xs font-medium text-gray-400">= tuần trước</span>}
              {leadDelta !== 0 && <span className="text-xs opacity-70">so tuần trước</span>}
            </div>
            <p className="text-xs opacity-50 mt-1">{leadDateLabel}</p>
          </div>
          <span className="opacity-60 text-2xl">›</span>
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
              <div>
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-medium text-ink truncate">
                        {payment.enrollment.contact.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {payment.enrollment.class.name} · {timeAgo(payment.approved_at)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-500 whitespace-nowrap">
                      +{formatCurrency(Number(payment.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* PANEL — Bảo lưu sắp hết hạn (ẩn nếu không có ai) */}
      {expiringSoon.length > 0 && (
        <div className="mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
              <h2 className="font-semibold text-ink flex items-center gap-2">
                <span>⚠️</span>
                Bảo lưu sắp hết hạn
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {expiringSoon.length}
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {expiringSoon.map((enrollment) => {
                const daysLeft = Math.ceil(
                  (enrollment.suspended_until!.getTime() - now.getTime()) / 86400000
                )
                const urgencyColor =
                  daysLeft <= 7
                    ? 'text-red-500'
                    : daysLeft <= 14
                      ? 'text-amber-500'
                      : 'text-blue-400'
                return (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-medium text-ink truncate">{enrollment.contact.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {enrollment.contact.phone} · {enrollment.class.name}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 whitespace-nowrap ${urgencyColor}`}>
                      Còn {daysLeft} ngày
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
