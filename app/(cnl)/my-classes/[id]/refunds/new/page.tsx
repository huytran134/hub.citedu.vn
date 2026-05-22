'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_transfer', label: 'Chuyển khoản' },
]

function NewRefundForm({ classId }: { classId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const enrollmentId = searchParams.get('enrollment_id') ?? ''
  const studentName = searchParams.get('student_name') ?? ''
  const agreedPrice = Number(searchParams.get('agreed_price') ?? '0')
  const paid = Number(searchParams.get('paid') ?? '0')
  const maxRefundable = Number(searchParams.get('max_refundable') ?? '0')

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [refundMethod, setRefundMethod] = useState('bank_transfer')
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

  const amountNum = Number(amount)
  const amountExceedsMax = amountNum > maxRefundable

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!amountNum || amountNum <= 0) {
      setError('Số tiền phải lớn hơn 0')
      return
    }
    if (amountNum > maxRefundable) {
      setError(`Số tiền hoàn không được vượt quá ${formatCurrency(maxRefundable)}`)
      return
    }
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do hoàn tiền')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          amount: amountNum,
          reason: reason.trim(),
          refund_method: refundMethod,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra')
        return
      }

      setSuccess(`Lệnh hoàn #${data.id.slice(-6).toUpperCase()} đã gửi Admin duyệt`)
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
          <p className="text-sm text-green-700 mt-1">Admin sẽ duyệt và nhập ngày trả tiền</p>
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
        <div className="mt-2 space-y-0.5 text-sm">
          <p className="text-muted-foreground">
            Học phí TT: <span className="font-medium text-ink">{formatCurrency(agreedPrice)}</span>
          </p>
          <p className="text-green-600">
            Đã đóng: <span className="font-medium">{formatCurrency(paid)}</span>
          </p>
          <p className={`font-semibold ${maxRefundable > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            Tối đa có thể hoàn: {formatCurrency(maxRefundable)}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Số tiền hoàn */}
      <div className="bg-background rounded-xl px-4 py-4 shadow-sm border border-border">
        <label className="block text-sm font-medium text-ink mb-2">
          Số tiền hoàn (đ) <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="number"
          min="1"
          max={maxRefundable}
          step="100000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Nhập số tiền cần hoàn..."
          className={`w-full border rounded-lg px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 transition-colors ${
            amountExceedsMax
              ? 'border-red-400 focus:ring-red-200 bg-red-50'
              : 'border-border bg-background text-foreground focus:ring-flame/30 focus:border-flame'
          }`}
        />
        {amount && amountNum > 0 && !amountExceedsMax && (
          <p className="text-xs text-muted-foreground/70 mt-1">{formatCurrency(amountNum)}</p>
        )}
        {amountExceedsMax && (
          <p className="text-xs text-red-600 mt-1 font-medium">
            Số tiền hoàn không được vượt quá {formatCurrency(maxRefundable)} đã đóng
          </p>
        )}
      </div>

      {/* Lý do hoàn */}
      <div className="bg-background rounded-xl px-4 py-4 shadow-sm border border-border">
        <label className="block text-sm font-medium text-ink mb-2">
          Lý do hoàn tiền <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ví dụ: Nghỉ 3 buổi có lý do, hoàn 60% theo chính sách..."
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame resize-none"
        />
      </div>

      {/* Hình thức hoàn */}
      <div className="bg-background rounded-xl px-4 py-4 shadow-sm border border-border">
        <label className="block text-sm font-medium text-ink mb-3">
          Hình thức hoàn <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {METHOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRefundMethod(opt.value)}
              className={`py-3 rounded-lg text-sm font-semibold border-2 transition-colors min-h-[44px] ${
                refundMethod === opt.value
                  ? 'bg-flame text-white border-flame'
                  : 'bg-background text-muted-foreground border-border hover:border-flame/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nút gửi — 44px min-height */}
      <button
        type="submit"
        disabled={loading || amountExceedsMax || maxRefundable <= 0}
        className="w-full bg-flame text-white rounded-lg py-4 font-bold text-base hover:bg-flame-light transition-colors disabled:opacity-60 min-h-[56px]"
      >
        {loading ? 'Đang gửi...' : 'Tạo lệnh hoàn tiền'}
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

export default function NewRefundPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold text-ink mb-5">Tạo lệnh hoàn tiền</h1>
      <Suspense fallback={<div className="text-gray-400 text-sm">Đang tải...</div>}>
        <NewRefundForm classId={params.id} />
      </Suspense>
    </div>
  )
}
