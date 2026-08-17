'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

export interface WaitlistEnrollment {
  id: string
  contact: { name: string; phone: string }
  class: {
    id: string
    name: string
    program: { name: string; branch: string }
  }
  agreed_price: number
  created_at: string
}

export interface AvailableClass {
  id: string
  name: string
  enrolledCount: number
  max_students: number
  program: { name: string; price: number }
}

const BRANCH_LABEL: Record<string, string> = {
  tu_duy: 'Tư duy',
  coaching: 'Coaching 1-1',
  ky_nang: 'Kỹ năng',
}

export default function WaitlistSection({
  initialWaitlist,
  availableClasses,
}: {
  initialWaitlist: WaitlistEnrollment[]
  availableClasses: AvailableClass[]
}) {
  const [waitlist, setWaitlist] = useState(initialWaitlist)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [agreedPrice, setAgreedPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function openPanel(enrollment: WaitlistEnrollment) {
    setActiveId(enrollment.id)
    setError('')
    // Pre-fill lớp hiện tại (nếu có trong danh sách khả dụng)
    const same = availableClasses.find((c) => c.id === enrollment.class.id)
    if (same) {
      setSelectedClassId(same.id)
      setAgreedPrice(String(same.program.price))
    } else {
      setSelectedClassId(availableClasses[0]?.id ?? '')
      setAgreedPrice(availableClasses[0] ? String(availableClasses[0].program.price) : '')
    }
  }

  function closePanel() {
    setActiveId(null)
    setError('')
  }

  function onClassChange(classId: string) {
    setSelectedClassId(classId)
    const cls = availableClasses.find((c) => c.id === classId)
    if (cls) setAgreedPrice(String(cls.program.price))
  }

  async function handleActivate(enrollmentId: string) {
    if (!selectedClassId) {
      setError('Vui lòng chọn lớp học')
      return
    }
    const price = Number(agreedPrice)
    if (!price || price <= 0) {
      setError('Học phí thỏa thuận phải lớn hơn 0')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: selectedClassId, agreed_price: price }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra')
        return
      }
      // Xóa khỏi danh sách waitlist sau khi xếp thành công
      setWaitlist((prev) => prev.filter((e) => e.id !== enrollmentId))
      closePanel()
    } catch {
      setError('Không thể kết nối đến máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  if (waitlist.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-green-500 font-semibold text-lg">✓ Không có học viên nào đang chờ xếp lớp</p>
        <p className="text-gray-400 text-sm mt-1">Danh sách waitlist trống</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {waitlist.map((enrollment) => {
        const isActive = activeId === enrollment.id
        const selectedClass = availableClasses.find((c) => c.id === selectedClassId)

        return (
          <div
            key={enrollment.id}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            {/* Row chính */}
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#7fb8f5]">{enrollment.contact.name}</span>
                  <span className="text-[#6b7fa3] text-sm">·</span>
                  <span className="text-sm text-[#c8d8f0]">{enrollment.contact.phone}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#6b7fa3] flex-wrap">
                  <span>
                    {BRANCH_LABEL[enrollment.class.program.branch] ?? enrollment.class.program.branch}
                    {' · '}{enrollment.class.program.name}
                  </span>
                  <span>Lớp chờ: {enrollment.class.name}</span>
                  <span>
                    Đăng ký:{' '}
                    {new Date(enrollment.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#3d2a0a] text-[#f5a623] border border-[#5a3d10]">
                  Chờ xếp lớp
                </span>
                {!isActive && (
                  <button
                    onClick={() => openPanel(enrollment)}
                    className="bg-flame text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-flame-light transition-colors"
                  >
                    Xếp vào lớp
                  </button>
                )}
                {isActive && (
                  <button
                    onClick={closePanel}
                    className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>

            {/* Panel xếp lớp */}
            {isActive && (
              <div className="px-5 pb-5 pt-4 border-t border-gray-100 dark:border-gray-700 bg-navy/5 dark:bg-navy/20">
                <p className="text-sm font-semibold text-[#c8d8f0] mb-4">
                  Xếp <span className="text-white">{enrollment.contact.name}</span> vào lớp
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Chọn lớp */}
                  <div>
                    <label className="block text-xs font-medium text-[#94b0d6] mb-1.5">
                      Lớp học <span className="text-red-400">*</span>
                    </label>
                    {availableClasses.length === 0 ? (
                      <p className="text-xs text-amber-400 bg-amber-900/30 rounded-lg px-3 py-2">
                        Không có lớp nào đang tuyển sinh hoặc đang học
                      </p>
                    ) : (
                      <select
                        value={selectedClassId}
                        onChange={(e) => onClassChange(e.target.value)}
                        className="w-full border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-sm bg-[#0f2341] text-[#c8d8f0] focus:outline-none focus:ring-2 focus:ring-flame/40 focus:border-flame"
                      >
                        {availableClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} ({cls.enrolledCount}/{cls.max_students} HV)
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedClass && (
                      <p className="text-xs text-[#6b7fa3] mt-1">
                        {selectedClass.program.name} · Còn {selectedClass.max_students - selectedClass.enrolledCount} chỗ
                      </p>
                    )}
                  </div>

                  {/* Học phí thỏa thuận */}
                  <div>
                    <label className="block text-xs font-medium text-[#94b0d6] mb-1.5">
                      Học phí thỏa thuận (đ) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="100000"
                      value={agreedPrice}
                      onChange={(e) => setAgreedPrice(e.target.value)}
                      placeholder="Nhập học phí..."
                      className="w-full border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-sm bg-[#0f2341] text-[#c8d8f0] focus:outline-none focus:ring-2 focus:ring-flame/40 focus:border-flame"
                    />
                    {agreedPrice && Number(agreedPrice) > 0 && (
                      <p className="text-xs text-[#6b7fa3] mt-1">
                        {formatCurrency(Number(agreedPrice))}
                        {selectedClass && Number(agreedPrice) !== selectedClass.program.price && (
                          <span className="ml-1 text-amber-400">
                            (giá niêm yết: {formatCurrency(selectedClass.program.price)})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-3">
                    {error}
                  </p>
                )}

                <button
                  onClick={() => handleActivate(enrollment.id)}
                  disabled={submitting || availableClasses.length === 0}
                  className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Đang xếp lớp...' : '✓ Xác nhận xếp vào lớp'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
