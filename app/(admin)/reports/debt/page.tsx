'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentDetail {
  id: string
  amount: number
  method: string
  status: string
  paid_at: string | null
  created_at: string
  approved_at: string | null
  rejection_reason: string | null
  note: string | null
  creator_name: string
  approver_name: string | null
}

interface RefundDetail {
  id: string
  amount: number
  reason: string
  status: string
  refunded_at: string | null
  created_at: string
}

interface DebtRow {
  enrollment_id: string
  enrollment_status: string
  contact_name: string
  contact_phone: string
  class_id: string
  class_name: string
  program_name: string
  program_branch: string
  agreed_price: number
  total_paid: number
  total_refunded: number
  net_paid: number
  debt: number
  payments: PaymentDetail[]
  refunds: RefundDetail[]
}

interface Summary {
  totalDebt: number
  debtorCount: number
  totalNetCollected: number
}

interface ClassOption {
  id: string
  name: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
}

const PAYMENT_STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  active: 'Đang học',
  suspended: 'Bảo lưu',
}

const ENROLLMENT_STATUS_CLASS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-blue-100 text-blue-700',
}

type DebtFilter = 'all' | 'has_debt' | 'paid_full'

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border shadow-sm px-5 py-4 ${
        highlight ? 'bg-amber-50 border-amber-200' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700'
      }`}
    >
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold leading-tight ${highlight ? 'text-amber-700' : 'text-ink'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function DebtBadge({ debt }: { debt: number }) {
  if (debt > 0) {
    return (
      <span className="font-bold text-amber-600">
        {formatCurrency(debt)}
      </span>
    )
  }
  if (debt === 0) {
    return (
      <span className="font-semibold text-green-600">Đã đủ</span>
    )
  }
  // debt < 0 = đã nộp dư
  return (
    <span className="font-semibold text-blue-600">
      Dư {formatCurrency(Math.abs(debt))}
    </span>
  )
}

// ─── Drawer Chi tiết ─────────────────────────────────────────────────────────

function DebtDrawer({
  row,
  onClose,
}: {
  row: DebtRow
  onClose: () => void
}) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
          <div>
            <h2 className="font-bold text-ink text-lg">{row.contact_name}</h2>
            <p className="text-sm text-gray-400">{row.contact_phone} · {row.class_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {/* Tổng quan tài chính */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Học phí thỏa thuận</p>
            <p className="font-bold text-ink">{formatCurrency(row.agreed_price)}</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Đã thu (ròng)</p>
            <p className="font-bold text-green-600">{formatCurrency(row.net_paid)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Còn nợ</p>
            <DebtBadge debt={row.debt} />
          </div>
        </div>

        {/* Lịch sử thanh toán */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Lịch sử phiếu thu ({row.payments.length})
          </h3>

          {row.payments.length === 0 ? (
            <p className="text-sm text-gray-400 mb-6">Chưa có phiếu thu nào</p>
          ) : (
            <div className="space-y-2 mb-6">
              {row.payments.map((p) => (
                <div
                  key={p.id}
                  className="border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-3 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-ink">{formatCurrency(p.amount)}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        PAYMENT_STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <p>
                      {METHOD_LABEL[p.method] ?? p.method} ·
                      Tạo: {new Date(p.created_at).toLocaleDateString('vi-VN')} bởi {p.creator_name}
                    </p>
                    {p.paid_at && (
                      <p>Ngày nhận tiền: {new Date(p.paid_at).toLocaleDateString('vi-VN')}</p>
                    )}
                    {p.rejection_reason && (
                      <p className="text-red-500">Lý do từ chối: {p.rejection_reason}</p>
                    )}
                    {p.note && <p className="italic">Ghi chú: {p.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lệnh hoàn tiền */}
          {row.refunds.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Lệnh hoàn tiền ({row.refunds.length})
              </h3>
              <div className="space-y-2">
                {row.refunds.map((r) => (
                  <div
                    key={r.id}
                    className="border border-blue-100 rounded-lg px-4 py-3 bg-blue-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-blue-700">− {formatCurrency(r.amount)}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          PAYMENT_STATUS_CLASS[r.status] ?? 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {PAYMENT_STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p>Lý do: {r.reason}</p>
                      {r.refunded_at && (
                        <p>Ngày hoàn: {new Date(r.refunded_at).toLocaleDateString('vi-VN')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DebtPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [allRows, setAllRows] = useState<DebtRow[]>([])
  const [classOptions, setClassOptions] = useState<ClassOption[]>([])

  const [debtFilter, setDebtFilter] = useState<DebtFilter>('all')
  const [classFilter, setClassFilter] = useState('')
  const [selectedRow, setSelectedRow] = useState<DebtRow | null>(null)

  useEffect(() => {
    fetch('/api/admin/reports/debt')
      .then((res) => res.json())
      .then((data) => {
        setSummary(data.summary)
        setAllRows(data.rows)
        setClassOptions(data.classOptions)
      })
      .finally(() => setLoading(false))
  }, [])

  // Filter client-side — dataset nhỏ (~100-200 records)
  const filteredRows = allRows.filter((row) => {
    if (classFilter && row.class_id !== classFilter) return false
    if (debtFilter === 'has_debt') return row.debt > 0
    if (debtFilter === 'paid_full') return row.debt <= 0
    return true
  })

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center text-gray-400">
        Đang tải...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Báo cáo Công nợ</h1>
        <p className="text-gray-500 text-sm mt-1">
          Học viên đang active hoặc bảo lưu · Tính theo học phí thỏa thuận
        </p>
      </div>

      {/* 3 Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <SummaryCard
            label="Tổng dự thu (còn nợ)"
            value={formatCurrency(summary.totalDebt)}
            sub={`${summary.debtorCount} học viên chưa đóng đủ`}
            highlight={summary.totalDebt > 0}
          />
          <SummaryCard
            label="Số học viên đang nợ"
            value={summary.debtorCount.toLocaleString('vi-VN')}
            sub="enrollment active/bảo lưu chưa đủ học phí"
          />
          <SummaryCard
            label="Tổng đã thu (ròng)"
            value={formatCurrency(summary.totalNetCollected)}
            sub="đã thu − đã hoàn, tất cả enrollment"
          />
        </div>
      )}

      {/* Bộ lọc */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-3 mb-4 flex flex-wrap items-center gap-3">
        {/* Filter nợ */}
        <div className="flex gap-1">
          {(
            [
              { value: 'all', label: 'Tất cả' },
              { value: 'has_debt', label: 'Chỉ đang nợ' },
              { value: 'paid_full', label: 'Đã đóng đủ' },
            ] as { value: DebtFilter; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDebtFilter(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                debtFilter === value
                  ? 'bg-navy text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter lớp */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 bg-white dark:bg-gray-800 text-ink dark:text-gray-100 min-w-[180px]"
        >
          <option value="">Tất cả lớp</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <span className="text-xs text-gray-400 ml-auto">
          {filteredRows.length} học viên
        </span>
      </div>

      {/* Bảng công nợ */}
      {filteredRows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
          <p className="text-gray-400">
            {debtFilter === 'has_debt'
              ? '✓ Không có học viên nào đang nợ học phí'
              : 'Không có dữ liệu phù hợp'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Học viên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Lớp học
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Học phí thỏa thuận
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Đã đóng
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Còn nợ
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.enrollment_id}
                  className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => setSelectedRow(row)}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{row.contact_name}</p>
                    <p className="text-xs text-gray-400">{row.contact_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{row.class_name}</p>
                    <p className="text-xs text-gray-400">{row.program_name}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatCurrency(row.agreed_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatCurrency(row.net_paid)}
                    {row.total_refunded > 0 && (
                      <p className="text-xs text-blue-500">
                        (Hoàn {formatCurrency(row.total_refunded)})
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DebtBadge debt={row.debt} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ENROLLMENT_STATUS_CLASS[row.enrollment_status] ??
                        'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {ENROLLMENT_STATUS_LABEL[row.enrollment_status] ?? row.enrollment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer chi tiết */}
      {selectedRow && (
        <DebtDrawer
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  )
}
