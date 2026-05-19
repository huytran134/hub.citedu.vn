'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@prisma/client'
import { formatCurrency } from '@/lib/utils'

interface Program {
  id: string
  name: string
  branch: string
  price: number
  level: number | null
  sessions_count: number | null
}

const BRANCH_LABEL: Record<string, string> = {
  tu_duy: 'Tư duy',
  coaching: 'Coaching 1-1',
  ky_nang: 'Kỹ năng',
}

export default function NewClassForm({
  programs,
  homerooms,
}: {
  programs: Program[]
  homerooms: User[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    program_id: '',
    name: '',
    format: 'offline',
    homeroom_id: '',
    start_date: '',
    end_date: '',
    location: '',
    max_students: '30',
  })

  const selectedProgram = programs.find((p) => p.id === form.program_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          homeroom_id: form.homeroom_id || null,
          max_students: Number(form.max_students),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra')
        return
      }

      router.push(`/classes/${data.id}`)
      router.refresh()
    } catch {
      setError('Không thể kết nối đến máy chủ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Chương trình */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Chương trình <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={form.program_id}
          onChange={(e) => setForm({ ...form, program_id: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
        >
          <option value="">-- Chọn chương trình --</option>
          {['tu_duy', 'coaching', 'ky_nang'].map((branch) => {
            const branchPrograms = programs.filter((p) => p.branch === branch)
            if (branchPrograms.length === 0) return null
            return (
              <optgroup key={branch} label={BRANCH_LABEL[branch]}>
                {branchPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)}
                    {p.sessions_count ? ` (${p.sessions_count} buổi)` : ''}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </select>
        {programs.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Chưa có chương trình nào. Liên hệ admin để tạo chương trình trước.
          </p>
        )}
      </div>

      {/* Tên lớp */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Tên lớp <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="text"
          placeholder="Ví dụ: Tư duy Tài Năng K5"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
        />
      </div>

      {/* Hình thức & Chủ nhiệm */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Hình thức</label>
          <select
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          >
            <option value="offline">Offline</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Chủ nhiệm lớp</label>
          <select
            value={form.homeroom_id}
            onChange={(e) => setForm({ ...form, homeroom_id: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          >
            <option value="">-- Chưa phân công --</option>
            {homerooms.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ngày khai giảng & Kết thúc */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Ngày khai giảng</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Ngày kết thúc</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          />
        </div>
      </div>

      {/* Địa điểm & Số học viên tối đa */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Địa điểm</label>
          <input
            type="text"
            placeholder="Tên cơ sở / địa chỉ"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Sĩ số tối đa</label>
          <input
            type="number"
            min="1"
            max="50"
            value={form.max_students}
            onChange={(e) => setForm({ ...form, max_students: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          />
        </div>
      </div>

      {selectedProgram && (
        <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-800">
          Học phí niêm yết: <strong>{formatCurrency(selectedProgram.price)}</strong> — Admin sẽ nhập học phí thỏa thuận khi thêm từng học viên.
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-200 text-gray-600 px-4 py-3 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-flame text-white px-4 py-3 rounded-lg font-semibold text-sm hover:bg-flame-light transition-colors disabled:opacity-60"
        >
          {loading ? 'Đang tạo...' : 'Tạo lớp học'}
        </button>
      </div>
    </form>
  )
}
