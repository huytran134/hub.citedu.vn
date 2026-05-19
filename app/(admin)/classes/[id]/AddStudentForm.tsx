'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

export default function AddStudentForm({
  classId,
  programPrice,
  sessionsCompleted,
  classStatus,
}: {
  classId: string
  programPrice: number
  sessionsCompleted: number
  classStatus: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '',
    phone: '',
    agreed_price: String(programPrice),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/classes/${classId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          agreed_price: Number(form.agreed_price),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra')
        return
      }

      const msg = data.warning
        ? `Đã thêm ${data.contact.name}. ⚠️ ${data.warning}`
        : `Đã thêm ${data.contact.name} vào lớp`
      setSuccess(msg)
      setForm({ name: '', phone: '', agreed_price: String(programPrice) })
      router.refresh()
    } catch {
      setError('Không thể kết nối đến máy chủ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => { setOpen(!open); setError(''); setSuccess('') }}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-ink">+ Thêm học viên vào lớp</span>
        <span className="text-gray-400 text-sm">{open ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {sessionsCompleted > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
              ⚠️ Lớp đã học <strong>{sessionsCompleted} buổi</strong>. Vui lòng điều chỉnh học phí thỏa thuận nếu cần.
            </div>
          )}
          {classStatus === 'active' && sessionsCompleted === 0 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3">
              Lớp đang hoạt động — học viên mới sẽ có trạng thái "Đang học".
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Họ tên <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Nguyễn Văn A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="tel"
                placeholder="0912345678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
              />
              <p className="text-xs text-gray-400 mt-1">Kiểm tra trùng SĐT tự động</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Học phí thỏa thuận (đ) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step="100000"
                value={form.agreed_price}
                onChange={(e) => setForm({ ...form, agreed_price: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
              />
              <p className="text-xs text-gray-400 mt-1">
                Niêm yết: {formatCurrency(programPrice)}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-flame text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-flame-light transition-colors disabled:opacity-60"
            >
              {loading ? 'Đang thêm...' : 'Thêm học viên'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
