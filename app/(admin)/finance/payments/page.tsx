'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Payment {
  id: string
  amount: number
  method: string
  note: string | null
  status: 'pending' | 'approved' | 'rejected'
  paid_at: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
  enrollment: {
    contact: { name: string; phone: string }
    class: { id: string; name: string; homeroom: { full_name: string } | null }
  }
  created_by: { full_name: string }
  approved_by: { full_name: string } | null
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-[#3d2a0a] text-[#f5a623] border border-[#5a3d10]',
  approved: 'bg-[#0a2d1a] text-[#3ecf8e] border border-[#145a30]',
  rejected: 'bg-[#2d0a0a] text-[#e86c6c] border border-[#5a1515]',
}

type SubTab = 'pending' | 'approved' | 'rejected'
type ActionType = 'approve' | 'reject' | null

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<SubTab>('pending')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<ActionType>(null)
  const [paidAt, setPaidAt] = useState(todayStr())
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  function todayStr() {
    return new Date().toISOString().split('T')[0]
  }

  async function fetchPayments(status: SubTab) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payments?status=${status}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayments(subTab) }, [subTab])

  function switchTab(tab: SubTab) {
    setSubTab(tab)
    closeAction()
  }

  function openAction(id: string, type: ActionType) {
    setActiveId(id)
    setActionType(type)
    setActionError('')
    setPaidAt(todayStr())
    setRejectionReason('')
  }

  function closeAction() {
    setActiveId(null)
    setActionType(null)
    setActionError('')
  }

  async function handleApprove(id: string) {
    if (!paidAt) {
      setActionError('Vui lòng nhập ngày nhận tiền')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/payments/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_at: paidAt }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error || 'Có lỗi xảy ra')
        return
      }
      // Xóa khỏi danh sách pending sau khi duyệt thành công
      setPayments((prev) => prev.filter((p) => p.id !== id))
      closeAction()
    } catch {
      setActionError('Không thể kết nối đến máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject(id: string) {
    if (!rejectionReason.trim()) {
      setActionError('Vui lòng nhập lý do từ chối')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/payments/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error || 'Có lỗi xảy ra')
        return
      }
      // Xóa khỏi danh sách pending sau khi từ chối thành công
      setPayments((prev) => prev.filter((p) => p.id !== id))
      closeAction()
    } catch {
      setActionError('Không thể kết nối đến máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = subTab === 'pending' ? payments.length : 0
  const now = Date.now()

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Đã từ chối' },
  ]

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#E8471A] uppercase tracking-wide">Phiếu thu</h1>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-5">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              subTab === t.key
                ? 'bg-navy text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
          Đang tải...
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400 text-lg">
            {subTab === 'pending' ? '✓ Không có phiếu nào chờ duyệt' : 'Không có phiếu nào'}
          </p>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((p) => {
            const hoursWaiting = Math.floor((now - new Date(p.created_at).getTime()) / 3600000)
            const isOverdue = p.status === 'pending' && hoursWaiting >= 24
            const isActive = activeId === p.id

            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border overflow-hidden transition-all ${
                  isOverdue ? 'border-amber-300' : 'border-gray-100 dark:border-gray-700'
                }`}
              >
                {/* Row chính */}
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#7fb8f5]">{p.enrollment.contact.name}</span>
                      <span className="text-[#6b7fa3] text-sm">·</span>
                      <span className="text-sm text-[#c8d8f0]">{p.enrollment.class.name}</span>
                      {isOverdue && (
                        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          {hoursWaiting}h chờ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-[#6b7fa3]">
                      <span>{p.enrollment.contact.phone}</span>
                      <span>CNL: {p.enrollment.class.homeroom?.full_name ?? '—'}</span>
                      <span>Tạo bởi: {p.created_by.full_name}</span>
                      <span>{new Date(p.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    {p.note && (
                      <p className="text-xs text-gray-500 mt-1 italic">Ghi chú: {p.note}</p>
                    )}
                    {/* Thông tin sau khi duyệt */}
                    {p.status === 'approved' && p.paid_at && (
                      <p className="text-xs text-green-600 mt-1">
                        Nhận tiền ngày {new Date(p.paid_at).toLocaleDateString('vi-VN')}
                        {p.approved_by && ` · Duyệt: ${p.approved_by.full_name}`}
                      </p>
                    )}
                    {p.status === 'rejected' && p.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">Từ chối: {p.rejection_reason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-lg text-[#c8d8f0]">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-[#6b7fa3]">{METHOD_LABEL[p.method]}</p>
                      {p.status !== 'pending' && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${STATUS_COLOR[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      )}
                    </div>

                    {/* Nút hành động — chỉ hiện khi tab pending */}
                    {p.status === 'pending' && !isActive && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAction(p.id, 'approve')}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => openAction(p.id, 'reject')}
                          className="border border-red-300 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                    {isActive && (
                      <button
                        onClick={closeAction}
                        className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </div>

                {/* Panel duyệt */}
                {isActive && actionType === 'approve' && (
                  <div className="px-5 pb-4 border-t border-gray-100 pt-4 bg-green-50">
                    <p className="text-sm font-medium text-green-800 mb-3">
                      Xác nhận duyệt phiếu thu {formatCurrency(p.amount)}
                    </p>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-green-800 mb-1">
                          Ngày nhận tiền thực tế <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={paidAt}
                          onChange={(e) => setPaidAt(e.target.value)}
                          max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          className="border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-green-700"
                        />
                      </div>
                      <button
                        onClick={() => handleApprove(p.id)}
                        disabled={submitting}
                        className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60 h-[38px]"
                      >
                        {submitting ? 'Đang duyệt...' : 'Xác nhận duyệt'}
                      </button>
                    </div>
                    {actionError && (
                      <p className="text-xs text-red-600 mt-2">{actionError}</p>
                    )}
                  </div>
                )}

                {/* Panel từ chối */}
                {isActive && actionType === 'reject' && (
                  <div className="px-5 pb-4 border-t border-gray-100 pt-4 bg-red-50">
                    <p className="text-sm font-medium text-red-800 mb-3">
                      Lý do từ chối phiếu thu {formatCurrency(p.amount)}
                    </p>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Nhập lý do từ chối (bắt buộc)"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-red-700"
                        />
                      </div>
                      <button
                        onClick={() => handleReject(p.id)}
                        disabled={submitting}
                        className="bg-red-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-60 h-[38px]"
                      >
                        {submitting ? 'Đang từ chối...' : 'Xác nhận từ chối'}
                      </button>
                    </div>
                    {actionError && (
                      <p className="text-xs text-red-600 mt-2">{actionError}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
