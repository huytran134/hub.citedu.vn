'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentRow {
  id: string
  amount: number
  method: string
  paid_at: string | null
  enrollment_id: string
  contact_name: string
  contact_phone: string
  class_name: string
  class_id: string
  program_name: string
  program_branch: string
}

interface Summary {
  totalAmount: number
  totalPayments: number
  distinctEnrollments: number
  avgPerPayment: number
}

interface ClassOption {
  id: string
  name: string
}

interface Group {
  key: string
  label: string
  totalAmount: number
  paymentCount: number
  prevAmount: number | null  // để tính % thay đổi
  payments: PaymentRow[]
}

type PresetRange = 'this_month' | 'last_month' | '3_months' | '6_months' | 'custom'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRANCH_LABEL: Record<string, string> = {
  tu_duy: 'Tư duy',
  coaching: 'Coaching',
  ky_nang: 'Kỹ năng',
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getPresetRange(preset: PresetRange): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (preset) {
    case 'this_month':
      return {
        from: toDateStr(new Date(y, m, 1)),
        to: toDateStr(now),
      }
    case 'last_month': {
      const first = new Date(y, m - 1, 1)
      const last = new Date(y, m, 0)
      return { from: toDateStr(first), to: toDateStr(last) }
    }
    case '3_months':
      return {
        from: toDateStr(new Date(y, m - 2, 1)),
        to: toDateStr(now),
      }
    case '6_months':
      return {
        from: toDateStr(new Date(y, m - 5, 1)),
        to: toDateStr(now),
      }
    default:
      return { from: toDateStr(new Date(y, m, 1)), to: toDateStr(now) }
  }
}

function diffDays(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 86400000
}

// Nhóm theo tháng (khi khoảng thời gian > 35 ngày)
function groupByMonth(payments: PaymentRow[]): Group[] {
  const map = new Map<string, PaymentRow[]>()

  for (const p of payments) {
    if (!p.paid_at) continue
    const d = new Date(p.paid_at)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }

  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))

  return sorted.map(([key, rows], i) => {
    const [yr, mo] = key.split('-')
    const prevAmount = i > 0 ? sorted[i - 1][1].reduce((s, p) => s + p.amount, 0) : null
    return {
      key,
      label: `Tháng ${Number(mo)}/${yr}`,
      totalAmount: rows.reduce((s, p) => s + p.amount, 0),
      paymentCount: rows.length,
      prevAmount,
      payments: rows,
    }
  })
}

// Nhóm theo tuần lịch (khi khoảng thời gian ≤ 35 ngày)
function groupByWeek(payments: PaymentRow[], fromStr: string): Group[] {
  const fromDate = new Date(fromStr)
  const map = new Map<number, PaymentRow[]>()

  for (const p of payments) {
    if (!p.paid_at) continue
    const d = new Date(p.paid_at)
    const weekIdx = Math.floor((d.getTime() - fromDate.getTime()) / (7 * 86400000))
    if (!map.has(weekIdx)) map.set(weekIdx, [])
    map.get(weekIdx)!.push(p)
  }

  const sorted = Array.from(map.entries()).sort(([a], [b]) => a - b)

  return sorted.map(([weekIdx, rows], i) => {
    const weekStart = new Date(fromDate.getTime() + weekIdx * 7 * 86400000)
    const weekEnd = new Date(weekStart.getTime() + 6 * 86400000)
    const fmt = (d: Date) =>
      `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
    const prevAmount = i > 0 ? sorted[i - 1][1].reduce((s, p) => s + p.amount, 0) : null
    return {
      key: `week-${weekIdx}`,
      label: `Tuần ${weekIdx + 1} (${fmt(weekStart)}–${fmt(weekEnd)})`,
      totalAmount: rows.reduce((s, p) => s + p.amount, 0),
      paymentCount: rows.length,
      prevAmount,
      payments: rows,
    }
  })
}

function buildGroups(payments: PaymentRow[], from: string, to: string): Group[] {
  if (diffDays(from, to) <= 35) {
    return groupByWeek(payments, from)
  }
  return groupByMonth(payments)
}

function pctChange(current: number, prev: number | null): string | null {
  if (prev === null || prev === 0) return null
  const pct = ((current - prev) / prev) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-ink leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function GroupRow({
  group,
  expanded,
  onToggle,
}: {
  group: Group
  expanded: boolean
  onToggle: () => void
}) {
  const pct = pctChange(group.totalAmount, group.prevAmount)

  return (
    <>
      {/* Dòng tổng hợp — click để mở/đóng */}
      <tr
        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer select-none border-b border-gray-100 dark:border-gray-700 transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-semibold text-ink flex items-center gap-2">
          <span className="text-gray-400 text-xs w-3">{expanded ? '▼' : '▶'}</span>
          {group.label}
        </td>
        <td className="px-4 py-3 text-center text-gray-600">{group.paymentCount}</td>
        <td className="px-4 py-3 text-right font-bold text-ink">
          {formatCurrency(group.totalAmount)}
        </td>
        <td className="px-4 py-3 text-right">
          {pct ? (
            <span
              className={`text-sm font-medium ${
                pct.startsWith('+') ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {pct}
            </span>
          ) : (
            <span className="text-gray-300 text-sm">—</span>
          )}
        </td>
      </tr>

      {/* Dòng chi tiết — accordion */}
      {expanded && (
        <tr>
          <td colSpan={4} className="p-0 bg-gray-50 dark:bg-gray-800">
            <div className="border-t border-gray-100">
              {group.payments.length === 0 ? (
                <p className="px-8 py-4 text-sm text-gray-400">Không có phiếu nào</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-8 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Học viên
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Lớp
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Hình thức
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Số tiền
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wide pr-6">
                        Ngày thu
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.payments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-8 py-2.5">
                          <span className="font-medium text-ink">{p.contact_name}</span>
                          <span className="text-gray-400 text-xs ml-2">{p.contact_phone}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{p.class_name}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {METHOD_LABEL[p.method] ?? p.method}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-ink">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500 pr-6 text-xs">
                          {p.paid_at
                            ? new Date(p.paid_at).toLocaleDateString('vi-VN')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PRESET_LABELS: { value: PresetRange; label: string }[] = [
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: '3_months', label: '3 tháng' },
  { value: '6_months', label: '6 tháng' },
  { value: 'custom', label: 'Tuỳ chọn' },
]

const BRANCH_OPTIONS = [
  { value: '', label: 'Tất cả nhánh' },
  { value: 'tu_duy', label: 'Tư duy' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'ky_nang', label: 'Kỹ năng' },
]

export default function RevenuePage() {
  const [preset, setPreset] = useState<PresetRange>('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [classId, setClassId] = useState('')
  const [branch, setBranch] = useState('')

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const activeRange =
    preset === 'custom'
      ? { from: customFrom, to: customTo }
      : getPresetRange(preset)

  const fetchData = useCallback(async () => {
    const { from, to } = activeRange
    if (!from || !to) return

    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (classId) params.set('classId', classId)
      if (branch) params.set('branch', branch)

      const res = await fetch(`/api/admin/reports/revenue?${params}`)
      if (!res.ok) return

      const data = await res.json()
      setSummary(data.summary)
      setClasses(data.classes)
      setGroups(buildGroups(data.payments, from, to))
      setExpandedKeys(new Set())
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo, classId, branch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function toggleGroup(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const { from: rangeFrom, to: rangeTo } = activeRange
  const rangeLabel =
    preset === 'custom'
      ? `${rangeFrom} → ${rangeTo}`
      : `${rangeFrom} → ${rangeTo}`

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Báo cáo Doanh thu</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tổng hợp phiếu thu đã duyệt · Tính theo ngày nhận tiền thực tế
        </p>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-4 mb-5">
        {/* Preset buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {PRESET_LABELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPreset(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                preset === value
                  ? 'bg-navy text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {preset === 'custom' && (
          <div className="flex items-center gap-3 mb-4">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              min={customFrom}
              className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>
        )}

        {/* Dropdown filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-navy/30 min-w-[200px]"
          >
            <option value="">Tất cả lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-navy/30"
          >
            {BRANCH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {(classId || branch) && (
            <button
              onClick={() => { setClassId(''); setBranch('') }}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Bỏ lọc
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center text-gray-400 dark:text-gray-500">
          Đang tải...
        </div>
      ) : (
        <>
          {/* 4 Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <SummaryCard
                label="Tổng thu trong kỳ"
                value={formatCurrency(summary.totalAmount)}
                sub={rangeLabel}
              />
              <SummaryCard
                label="Số phiếu đã duyệt"
                value={summary.totalPayments.toLocaleString('vi-VN')}
                sub="phiếu thu approved"
              />
              <SummaryCard
                label="Học viên đã đóng"
                value={summary.distinctEnrollments.toLocaleString('vi-VN')}
                sub="enrollment khác nhau"
              />
              <SummaryCard
                label="Trung bình / phiếu"
                value={summary.totalPayments > 0 ? formatCurrency(summary.avgPerPayment) : '—'}
                sub="tổng thu ÷ số phiếu"
              />
            </div>
          )}

          {/* Bảng nhóm theo tháng/tuần */}
          {groups.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
              <p className="text-gray-400 dark:text-gray-500">Không có phiếu thu nào trong khoảng thời gian này</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-ink dark:text-gray-100 text-sm uppercase tracking-wide">
                  Chi tiết theo {diffDays(rangeFrom, rangeTo) <= 35 ? 'tuần' : 'tháng'}
                </h2>
                <p className="text-xs text-gray-400">Click vào dòng để xem chi tiết phiếu</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {diffDays(rangeFrom, rangeTo) <= 35 ? 'Tuần' : 'Tháng'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Số phiếu
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Tổng thu
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">
                      So với kỳ trước
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <GroupRow
                      key={group.key}
                      group={group}
                      expanded={expandedKeys.has(group.key)}
                      onToggle={() => toggleGroup(group.key)}
                    />
                  ))}
                </tbody>
                {/* Dòng tổng cộng */}
                {summary && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                      <td className="px-4 py-3 font-bold text-ink">Tổng cộng</td>
                      <td className="px-4 py-3 text-center font-semibold text-ink">
                        {summary.totalPayments}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-flame text-lg">
                        {formatCurrency(summary.totalAmount)}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
