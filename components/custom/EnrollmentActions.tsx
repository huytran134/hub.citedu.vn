'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type EnrollmentStatus = 'waitlist' | 'active' | 'suspended' | 'completed' | 'dropped'
type DropStep = 'form' | 'confirm_debt'

interface Props {
  enrollmentId: string
  contactName: string
  status: EnrollmentStatus
  suspendedUntil: string | null
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function EnrollmentActions({
  enrollmentId,
  contactName,
  status,
  suspendedUntil,
}: Props) {
  const router = useRouter()

  const [showSuspend, setShowSuspend] = useState(false)
  const [showDrop, setShowDrop] = useState(false)
  const [showReactivate, setShowReactivate] = useState(false)

  // Suspend form
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendedAt, setSuspendedAt] = useState(todayStr)
  const [suspendedUntilInput, setSuspendedUntilInput] = useState('')
  const [suspending, setSuspending] = useState(false)

  // Drop form
  const [dropReason, setDropReason] = useState('')
  const [dropStep, setDropStep] = useState<DropStep>('form')
  const [pendingDebtFormatted, setPendingDebtFormatted] = useState('')
  const [debtConfirmed, setDebtConfirmed] = useState(false)
  const [dropping, setDropping] = useState(false)

  // Reactivate
  const [reactivating, setReactivating] = useState(false)

  // 36-month max for suspend-until
  const maxSuspendUntil = (() => {
    if (!suspendedAt) return ''
    const d = new Date(suspendedAt)
    d.setMonth(d.getMonth() + 36)
    return d.toISOString().slice(0, 10)
  })()
  const suspendUntilTooLong =
    suspendedUntilInput && maxSuspendUntil && suspendedUntilInput > maxSuspendUntil
  const canSuspend =
    suspendReason.trim() && suspendedAt && suspendedUntilInput && !suspendUntilTooLong && !suspending

  function resetSuspendForm() {
    setSuspendReason('')
    setSuspendedAt(todayStr())
    setSuspendedUntilInput('')
  }

  function resetDropForm() {
    setDropReason('')
    setDropStep('form')
    setPendingDebtFormatted('')
    setDebtConfirmed(false)
  }

  async function handleSuspend() {
    if (!canSuspend) return
    setSuspending(true)
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspended_reason: suspendReason,
          suspended_at: suspendedAt,
          suspended_until: suspendedUntilInput,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Lỗi bảo lưu')
        return
      }
      setShowSuspend(false)
      resetSuspendForm()
      router.refresh()
    } finally {
      setSuspending(false)
    }
  }

  async function handleReactivate() {
    setReactivating(true)
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}/reactivate`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Lỗi kích hoạt lại')
        return
      }
      setShowReactivate(false)
      router.refresh()
    } finally {
      setReactivating(false)
    }
  }

  async function handleDrop() {
    if (!dropReason.trim() || dropping) return
    setDropping(true)
    try {
      const body: Record<string, unknown> = { dropped_reason: dropReason }
      if (dropStep === 'confirm_debt') body.confirmedDebt = true

      const res = await fetch(`/api/admin/enrollments/${enrollmentId}/drop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.requiresConfirmation) {
        setPendingDebtFormatted(data.debtFormatted)
        setDropStep('confirm_debt')
        return
      }
      if (!res.ok) {
        alert(data.error || 'Lỗi thôi học')
        return
      }
      setShowDrop(false)
      resetDropForm()
      router.refresh()
    } finally {
      setDropping(false)
    }
  }

  // Trạng thái cuối không có hành động
  if (status === 'dropped' || status === 'completed' || status === 'waitlist') {
    return null
  }

  return (
    <>
      {/* Nút hành động inline */}
      <div className="flex items-center gap-1">
        {status === 'active' && (
          <>
            <button
              onClick={() => { resetSuspendForm(); setShowSuspend(true) }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Bảo lưu
            </button>
            <button
              onClick={() => { resetDropForm(); setShowDrop(true) }}
              className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              Thôi học
            </button>
          </>
        )}
        {status === 'suspended' && (
          <>
            <button
              onClick={() => setShowReactivate(true)}
              className="text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded hover:bg-green-50 transition-colors whitespace-nowrap"
            >
              Kích hoạt lại
            </button>
            <button
              onClick={() => { resetDropForm(); setShowDrop(true) }}
              className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              Thôi học
            </button>
          </>
        )}
      </div>

      {/* Dialog A — Bảo lưu */}
      {showSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-ink text-lg">Bảo lưu học viên</h3>
              <p className="text-sm text-gray-500 mt-0.5">{contactName}</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  Lý do bảo lưu <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="VD: Đi du học 6 tháng, công việc bận..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={suspendedAt}
                    onChange={(e) => { setSuspendedAt(e.target.value); setSuspendedUntilInput('') }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                    Bảo lưu đến <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={suspendedUntilInput}
                    onChange={(e) => setSuspendedUntilInput(e.target.value)}
                    min={suspendedAt}
                    max={maxSuspendUntil}
                    className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 ${
                      suspendUntilTooLong
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                        : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
                    }`}
                  />
                </div>
              </div>
              {suspendUntilTooLong ? (
                <p className="text-xs text-red-500">Tối đa 36 tháng kể từ ngày bắt đầu bảo lưu</p>
              ) : maxSuspendUntil ? (
                <p className="text-xs text-gray-400">
                  Tối đa đến: {new Date(maxSuspendUntil).toLocaleDateString('vi-VN')}
                </p>
              ) : null}
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                onClick={() => { setShowSuspend(false); resetSuspendForm() }}
                className="px-4 py-2 text-sm text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSuspend}
                disabled={!canSuspend}
                className="px-5 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-blue-600 transition-colors"
              >
                {suspending ? 'Đang xử lý...' : 'Xác nhận bảo lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog — Xác nhận kích hoạt lại */}
      {showReactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 pt-6 pb-4">
              <h3 className="font-bold text-ink text-lg">Kích hoạt lại</h3>
              <p className="text-sm text-gray-500 mt-1">
                Cho học viên <strong>{contactName}</strong> quay lại học?
              </p>
              {suspendedUntil && (
                <p className="text-xs text-blue-600 mt-2">
                  Bảo lưu đến: {new Date(suspendedUntil).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowReactivate(false)}
                className="px-4 py-2 text-sm text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-green-700 transition-colors"
              >
                {reactivating ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog B — Thôi học */}
      {showDrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-ink text-lg">Thôi học</h3>
              <p className="text-sm text-gray-500 mt-0.5">{contactName}</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  Lý do thôi học <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  placeholder="VD: Không tiếp tục theo học, chuyển công việc..."
                  rows={3}
                  disabled={dropStep === 'confirm_debt'}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              {dropStep === 'confirm_debt' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-amber-800 mb-1">
                    ⚠️ Học viên còn nợ {pendingDebtFormatted} học phí
                  </p>
                  <p className="text-xs text-amber-700">
                    Xác nhận thôi học sẽ không tự động xóa khoản nợ. Bạn cần xử lý công nợ riêng sau khi thôi học.
                  </p>
                  <label className="flex items-start gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debtConfirmed}
                      onChange={(e) => setDebtConfirmed(e.target.checked)}
                      className="mt-0.5 accent-red-600"
                    />
                    <span className="text-xs text-amber-800 font-medium">
                      Tôi đã hiểu và xác nhận thôi học dù còn công nợ
                    </span>
                  </label>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                onClick={() => { setShowDrop(false); resetDropForm() }}
                className="px-4 py-2 text-sm text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                {dropStep === 'confirm_debt' ? 'Hủy — xử lý công nợ trước' : 'Hủy'}
              </button>
              <button
                onClick={handleDrop}
                disabled={
                  !dropReason.trim() ||
                  dropping ||
                  (dropStep === 'confirm_debt' && !debtConfirmed)
                }
                className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-red-700 transition-colors"
              >
                {dropping ? 'Đang xử lý...' : 'Xác nhận thôi học'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
