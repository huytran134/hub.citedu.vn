'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const BRANCH_OPTIONS = [
  { value: 'tu_duy', label: 'Tư duy' },
  { value: 'coaching', label: 'Coaching 1-1 (Mật Thất)' },
  { value: 'ky_nang', label: 'Kỹ năng bổ trợ' },
]

const LEVEL_OPTIONS = [
  { value: 1, label: 'Cấp 1' },
  { value: 2, label: 'Cấp 2' },
  { value: 3, label: 'Cấp 3' },
]

type Form = {
  name: string
  description: string
  branch: string
  level: string
  price: string
  sessions_count: string
}

const EMPTY_FORM: Form = {
  name: '',
  description: '',
  branch: 'tu_duy',
  level: '1',
  price: '',
  sessions_count: '',
}

export default function CreateProgramDialog() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof Form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openDialog() {
    setForm(EMPTY_FORM)
    setError('')
    setIsOpen(true)
  }

  function closeDialog() {
    setIsOpen(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const priceNum = parseInt(form.price.replace(/\D/g, ''), 10)
    const sessionsNum = parseInt(form.sessions_count, 10)

    if (!form.name.trim()) {
      setError('Vui lòng nhập tên khóa học')
      return
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Giá niêm yết phải lớn hơn 0')
      return
    }
    if (isNaN(sessionsNum) || sessionsNum <= 0) {
      setError('Số buổi học phải lớn hơn 0')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          branch: form.branch,
          level: form.branch === 'tu_duy' ? Number(form.level) : null,
          price: priceNum,
          sessions_count: sessionsNum,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Có lỗi xảy ra')
        return
      }

      const program = await res.json()
      setIsOpen(false)
      router.push(`/classes/lessons/${program.id}`)
    } catch {
      setError('Không thể kết nối server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={openDialog}
        className="bg-flame text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-flame-light transition-colors"
      >
        + Thêm khóa học
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeDialog}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-ink">Thêm khóa học mới</h2>
              <button
                onClick={closeDialog}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Tên khóa học */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tên khóa học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="VD: Tư duy Tài Năng"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
                  required
                />
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mô tả (không bắt buộc)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Mô tả ngắn về khóa học"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
                />
              </div>

              {/* Nhánh + Cấp độ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nhánh <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.branch}
                    onChange={(e) => set('branch', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 bg-white"
                  >
                    {BRANCH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Cấp độ — chỉ hiện khi chọn tu_duy */}
                {form.branch === 'tu_duy' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Cấp độ <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.level}
                      onChange={(e) => set('level', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 bg-white"
                    >
                      {LEVEL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Giá + Số buổi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Giá niêm yết (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="VD: 5000000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Số buổi học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.sessions_count}
                    onChange={(e) => set('sessions_count', e.target.value)}
                    placeholder="VD: 8"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
                    required
                  />
                </div>
              </div>

              {form.sessions_count && parseInt(form.sessions_count, 10) > 0 && (
                <p className="text-xs text-gray-400">
                  Hệ thống sẽ tự tạo {form.sessions_count} buổi học rỗng — Admin nhập nội dung sau.
                </p>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-flame text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-flame-light disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Đang tạo...' : 'Tạo khóa học'}
                </button>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
