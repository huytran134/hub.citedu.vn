'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddLessonForm({
  programId,
  existingNumbers,
  totalSessions,
}: {
  programId: string
  existingNumbers: number[]
  totalSessions: number
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ session_number: '', title: '', objectives: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Tìm số buổi tiếp theo chưa có
  const nextNumber = (() => {
    for (let i = 1; i <= (totalSessions || 99); i++) {
      if (!existingNumbers.includes(i)) return i
    }
    return existingNumbers.length + 1
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/programs/${programId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_number: Number(form.session_number),
          title: form.title.trim(),
          objectives: form.objectives.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Có lỗi xảy ra')
        return
      }
      setForm({ session_number: '', title: '', objectives: '' })
      setIsOpen(false)
      router.refresh()
    } catch {
      setError('Không thể kết nối server')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setForm({ session_number: String(nextNumber), title: '', objectives: '' })
          setIsOpen(true)
        }}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-flame/40 hover:text-flame transition-colors"
      >
        + Thêm buổi học mới
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-ink mb-4">Thêm buổi học mới</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Số buổi *</label>
            <input
              type="number"
              min={1}
              value={form.session_number}
              onChange={(e) => setForm((f) => ({ ...f, session_number: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề buổi học *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="VD: Tư duy về mục tiêu và hành động"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mục tiêu buổi học</label>
          <input
            type="text"
            value={form.objectives}
            onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
            placeholder="Học viên hiểu được... / Học viên làm được..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="bg-flame text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-flame-light disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang tạo...' : 'Tạo buổi học'}
          </button>
          <button
            type="button"
            onClick={() => { setIsOpen(false); setError('') }}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  )
}
