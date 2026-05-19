'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface PendingPayment {
  id: string
  amount: number
  method: string
  note: string | null
  created_at: string
  enrollment: {
    contact: { name: string; phone: string }
    class: { id: string; name: string; homeroom: { full_name: string } | null }
  }
  created_by: { full_name: string }
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
}

type ActionType = 'approve' | 'reject' | null

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<ActionType>(null)
  const [paidAt, setPaidAt] = useState(todayStr())
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  function todayStr() {
    return new Date().toISOString().split('T')[0]
  }

  async function fetchPayments() {
    try {
      const res = await fetch('/api/admin/payments')
      if (res.ok) {
        const data = await res.json()
        setPayments(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayments() }, [])

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
      setPayments((prev) => prev.filter((p) => p.id !== id))
      closeAction()
    } catch {
      setActionError('Không thể kết nối đến máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  const now = Date.now()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Phiếu thu chờ duyệt</h1>
        <p className="text-gray-500 text-sm mt-1">
          {loading ? '...' : `${payments.length} phiếu đang chờ duyệt · Sắp xếp theo thứ tự tạo (cũ nhất lên đầu)`}
        </p>
      </div>

      {loading && (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          Đang tải...
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400 text-lg">✓ Không có phiếu nào chờ duyệt</p>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((p) => {
            const hoursWaiting = Math.floor((now - new Date(p.created_at).getTime()) / 3600000)
            const isOverdue = hoursWaiting >= 24
            const isActive = activeId === p.id

            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                  isOverdue ? 'border-amber-300' : 'border-gray-100'
                }`}
              >
                {/* Row chính */}
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink">{p.enrollment.contact.name}</span>
                      <span className="text-gray-400 text-sm">·</span>
                      <span className="text-sm text-gray-500">{p.enrollment.class.name}</span>
                      {isOverdue && (
                        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          {hoursWaiting}h chờ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span>{p.enrollment.contact.phone}</span>
                      <span>CNL: {p.enrollment.class.homeroom?.full_name ?? '—'}</span>
                      <span>Tạo bởi: {p.created_by.full_name}</span>
                      <span>{new Date(p.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    {p.note && (
                      <p className="text-xs text-gray-500 mt-1 italic">Ghi chú: {p.note}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-lg text-ink">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-gray-400">{METHOD_LABEL[p.method]}</p>
                    </div>

                    {!isActive && (
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
                          className="border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
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
                          className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
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
