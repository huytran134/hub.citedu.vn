'use client'

import { useState, useCallback } from 'react'

export type MakeupStudent = {
  makeup_id: string
  contact_name: string
  original_class_name: string
  original_session_number: number
  attendance_status: 'scheduled' | 'attended' | 'absent'
}

type Toast = { id: number; message: string; type: 'success' | 'error' }

type Props = {
  students: MakeupStudent[]
}

export default function MakeupStudentSection({ students }: Props) {
  const [statuses, setStatuses] = useState<Record<string, MakeupStudent['attendance_status']>>(
    () => Object.fromEntries(students.map((s) => [s.makeup_id, s.attendance_status])),
  )
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 1500)
  }, [])

  const handleMark = useCallback(
    async (makeupId: string, newStatus: 'attended' | 'absent') => {
      if (loading[makeupId]) return
      if (statuses[makeupId] === newStatus) return

      const prev = statuses[makeupId]
      setStatuses((s) => ({ ...s, [makeupId]: newStatus }))
      setLoading((l) => ({ ...l, [makeupId]: true }))

      try {
        const res = await fetch(`/api/makeup-sessions/${makeupId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attendance_status: newStatus }),
        })
        if (!res.ok) throw new Error()
        addToast('Đã lưu', 'success')
      } catch {
        setStatuses((s) => ({ ...s, [makeupId]: prev }))
        addToast('Lưu thất bại, thử lại', 'error')
      } finally {
        setLoading((l) => ({ ...l, [makeupId]: false }))
      }
    },
    [statuses, loading, addToast],
  )

  if (students.length === 0) return null

  return (
    <div className="mt-5">
      {/* Toast */}
      <div className="fixed top-16 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
              t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-ink dark:text-gray-100">
          Học viên học bù
        </span>
        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold">
          {students.length}
        </span>
      </div>

      <div className="space-y-3">
        {students.map((student) => {
          const current = statuses[student.makeup_id]
          const isLoading = loading[student.makeup_id]

          return (
            <div
              key={student.makeup_id}
              className="bg-white dark:bg-gray-800 rounded-xl px-4 py-4 shadow-sm border-2 border-blue-200 dark:border-blue-900/50"
            >
              {/* Thông tin học viên */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                    {student.contact_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-ink dark:text-gray-100 truncate">
                      {student.contact_name}
                    </p>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                      Học bù
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Lớp gốc: {student.original_class_name} · Buổi #{student.original_session_number}
                  </p>
                </div>
                {isLoading && (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-flame animate-spin flex-shrink-0" />
                )}
              </div>

              {/* 2 nút: Có mặt / Vắng — tối thiểu 44px */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleMark(student.makeup_id, 'attended')}
                  disabled={isLoading}
                  className={`min-h-[44px] rounded-lg border text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 ${
                    current === 'attended'
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800'
                  }`}
                >
                  Có mặt
                </button>
                <button
                  onClick={() => handleMark(student.makeup_id, 'absent')}
                  disabled={isLoading}
                  className={`min-h-[44px] rounded-lg border text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 ${
                    current === 'absent'
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800'
                  }`}
                >
                  Vắng
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
