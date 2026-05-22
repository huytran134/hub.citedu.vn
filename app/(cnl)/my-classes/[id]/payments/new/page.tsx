'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_transfer', label: 'Chuyển khoản' },
]

function NewPaymentForm({ classId }: { classId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const enrollmentId = searchParams.get('enrollment_id') ?? ''
  const studentName = searchParams.get('student_name') ?? ''
  const debtStr = searchParams.get('debt') ?? '0'
  const debt = Number(debtStr)

  const [amount, setAmount] = useState(debt > 0 ? String(debt) : '')
  const [method, setMethod] = useState('bank_transfer')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!enrollmentId) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
        Thiếu thông tin đăng ký. Vui lòng quay lại danh sách lớp.
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) {
      setError('Số tiền phải lớn hơn 0')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          amount: amountNum,
          method,
          note: note.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra')
        return
      }

      setSuccess(`Phiếu #${data.id.slice(-6).toUpperCase()} đã gửi Admin duyệt`)
    } catch {
      setError('Không thể kết nối đến máy chủ')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="font-semibold text-green-800">{success}</p>
          <p className="text-sm text-green-700 mt-1">Admin sẽ duyệt và nhập ngày nhận tiền</p>
        </div>
        <button
          onClick={() => router.back()}
          className="w-full bg-navy text-white rounded-lg py-3.5 font-semibold text-sm hover:bg-navy-light transition-colors min-h-[44px]"
        >
          ← Quay lại danh sách lớp
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Thông tin học viên */}
      <div className="bg-background rounded-xl px-4 py-4 shadow-sm border border-border">
        <p className="text-xs text-muted-foreground/70 mb-1">Học viên</p>
        <p className="font-semibold text-ink text-lg">{studentName}</p>
        {debt > 0 && (
          <p className="text-sm text-amber-600 mt-1">Còn nợ: {formatCurrency(debt)}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Số tiền */}
      <div className="bg-background rounded-xl px-4 py-4 shadow-sm border border-border">
        <label className="block text-sm font-medium text-ink mb-2">
          Số tiền thu (đ) <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="number"
          min="1"
          step="100000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Nhập số tiền..."
          className="w-full border border-border rounded-lg px-4 py-3 text-lg font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
        />
        {amount && Number(amount) > 0 && (
          <p className="text-xs text-muted-foreground/70 mt-1">{formatCurrency(Number(amount))}</p>
        )}
      </div>

      {/* Hình thức thanh toán */}
      <div className="bg-background rounded-xl px-4 py-4 shadow-sm border border-border">
        <label className="block text-sm font-medium text-ink mb-3">
          Hình thức <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {METHOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMethod(opt.value)}
              className={`py-3 rounded-lg text-sm font-semibold border-2 transition-colors min-h-[44px] ${
                method === opt.value
                  ? 'bg-flame text-white border-flame'
                  : 'bg-background text-muted-foreground border-border hover:border-flame/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ghi chú */}
      <div className="bg-background rounded-xl px-4 py-4 shadow-sm border border-border">
        <label className="block text-sm font-medium text-ink mb-2">Ghi chú (tùy chọn)</label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ: Đóng đợt 2, còn thiếu X..."
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame resize-none"
        />
      </div>

      {/* Nút gửi — 44px min-height */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-flame text-white rounded-lg py-4 font-bold text-base hover:bg-flame-light transition-colors disabled:opacity-60 min-h-[56px]"
      >
        {loading ? 'Đang gửi...' : 'Tạo phiếu thu'}
      </button>

      <button
        type="button"
        onClick={() => router.back()}
        className="w-full text-muted-foreground text-sm py-2 hover:text-foreground"
      >
        ← Hủy, quay lại
      </button>
    </form>
  )
}

export default function NewPaymentPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold text-ink mb-5">Tạo phiếu thu</h1>
      <Suspense fallback={<div className="text-gray-400 text-sm">Đang tải...</div>}>
        <NewPaymentForm classId={params.id} />
      </Suspense>
    </div>
  )
}
