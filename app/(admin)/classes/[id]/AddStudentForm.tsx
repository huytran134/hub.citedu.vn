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
    <div className="bg-[#0d1c33] border border-[#1e3060] rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => { setOpen(!open); setError(''); setSuccess('') }}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#0a1628] transition-colors"
      >
        <span className="font-semibold text-[#E8471A]">+ Thêm học viên vào lớp</span>
        <span className="text-[#6b7fa3] text-sm">{open ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 border-t border-[#1e3060] pt-4 space-y-4">
          {sessionsCompleted > 0 && (
            <div className="bg-[#3d2a0a] border border-[#5a3d10] text-[#f5a623] text-sm rounded-lg px-4 py-3">
              ⚠️ Lớp đã học <strong>{sessionsCompleted} buổi</strong>. Vui lòng điều chỉnh học phí thỏa thuận nếu cần.
            </div>
          )}
          {classStatus === 'active' && sessionsCompleted === 0 && (
            <div className="bg-[#0a1a3d] border border-[#1a3060] text-[#7fb8f5] text-sm rounded-lg px-4 py-3">
              Lớp đang hoạt động — học viên mới sẽ có trạng thái "Đang học".
            </div>
          )}

          {error && (
            <div className="bg-[#2d0a0a] border border-[#5a1515] text-[#e86c6c] text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-[#0a2d1a] border border-[#145a30] text-[#3ecf8e] text-sm rounded-lg px-4 py-3">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#94b0d6] mb-1.5">
                Họ tên <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Nguyễn Văn A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#0a1628] border border-[#2d4a7a] text-[#c8d8f0] rounded-lg px-3 py-2.5 text-sm placeholder:text-[#4a6080] focus:outline-none focus:ring-2 focus:ring-flame/40 focus:border-flame"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94b0d6] mb-1.5">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="tel"
                placeholder="0912345678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-[#0a1628] border border-[#2d4a7a] text-[#c8d8f0] rounded-lg px-3 py-2.5 text-sm placeholder:text-[#4a6080] focus:outline-none focus:ring-2 focus:ring-flame/40 focus:border-flame"
              />
              <p className="text-xs text-[#6b7fa3] mt-1">Kiểm tra trùng SĐT tự động</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94b0d6] mb-1.5">
                Học phí thỏa thuận (đ) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step="100000"
                value={form.agreed_price}
                onChange={(e) => setForm({ ...form, agreed_price: e.target.value })}
                className="w-full bg-[#0a1628] border border-[#2d4a7a] text-[#c8d8f0] rounded-lg px-3 py-2.5 text-sm placeholder:text-[#4a6080] focus:outline-none focus:ring-2 focus:ring-flame/40 focus:border-flame"
              />
              <p className="text-xs text-[#6b7fa3] mt-1">
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
