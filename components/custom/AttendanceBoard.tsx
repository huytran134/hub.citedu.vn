'use client'

import { useState, useCallback, useMemo } from 'react'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave_early'

export type StudentAttendance = {
  enrollment_id: string
  contact_name: string
  contact_phone: string
  status: AttendanceStatus | null
}

type Toast = { id: number; message: string; type: 'success' | 'error' }

// Thứ tự nút và màu highlight khi active
const STATUS_ORDER: AttendanceStatus[] = ['present', 'late', 'leave_early', 'absent']

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; inactive: string; active: string }
> = {
  present:     { label: 'Có mặt', inactive: 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800',           active: 'border-green-600 bg-green-600 text-white' },
  late:        { label: 'Trễ',    inactive: 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800',           active: 'border-amber-500 bg-amber-500 text-white' },
  leave_early: { label: 'Về sớm', inactive: 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800',           active: 'border-blue-500 bg-blue-500 text-white' },
  absent:      { label: 'Vắng',   inactive: 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800',           active: 'border-red-600 bg-red-600 text-white' },
}

interface Props {
  sessionId: string
  initialStudents: StudentAttendance[]
}

export default function AttendanceBoard({ sessionId, initialStudents }: Props) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | null>>(
    () => Object.fromEntries(initialStudents.map((s) => [s.enrollment_id, s.status])),
  )
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 1500)
  }, [])

  const handleMark = useCallback(
    async (enrollmentId: string, newStatus: AttendanceStatus) => {
      if (loading[enrollmentId]) return
      if (statuses[enrollmentId] === newStatus) return // bấm lại cùng trạng thái → bỏ qua

      const prev = statuses[enrollmentId]
      setStatuses((s) => ({ ...s, [enrollmentId]: newStatus })) // optimistic
      setLoading((l) => ({ ...l, [enrollmentId]: true }))

      try {
        const res = await fetch(
          `/api/cnl/sessions/${sessionId}/attendance/${enrollmentId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          },
        )
        if (!res.ok) throw new Error()
        addToast('Đã lưu', 'success')
      } catch {
        setStatuses((s) => ({ ...s, [enrollmentId]: prev })) // revert nếu lỗi
        addToast('Lưu thất bại, thử lại', 'error')
      } finally {
        setLoading((l) => ({ ...l, [enrollmentId]: false }))
      }
    },
    [statuses, loading, sessionId, addToast],
  )

  // Sắp xếp: chưa điểm danh (null) lên đầu, đã điểm danh xuống cuối
  // Trong mỗi nhóm: sort tên A-Z theo tiếng Việt
  const sortedStudents = useMemo(() => {
    return [...initialStudents].sort((a, b) => {
      const aMarked = statuses[a.enrollment_id] !== null ? 1 : 0
      const bMarked = statuses[b.enrollment_id] !== null ? 1 : 0
      if (aMarked !== bMarked) return aMarked - bMarked
      return a.contact_name.localeCompare(b.contact_name, 'vi')
    })
  }, [initialStudents, statuses])

  // Tóm tắt cho footer sticky
  const summary = Object.values(statuses).reduce(
    (acc, s) => {
      if (s === 'present') acc.present++
      else if (s === 'late') acc.late++
      else if (s === 'leave_early') acc.leave_early++
      else if (s === 'absent') acc.absent++
      else acc.unmarked++
      return acc
    },
    { present: 0, late: 0, leave_early: 0, absent: 0, unmarked: 0 },
  )

  const marked = summary.present + summary.late + summary.leave_early + summary.absent
  const total = initialStudents.length
  const progressPct = total > 0 ? Math.round((marked / total) * 100) : 0

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-ink">
            {marked}/{total} đã điểm danh
          </span>
          <span className="text-xs text-gray-400">{progressPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-flame rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Toast notifications — hiện ngắn, không chặn thao tác */}
      <div className="fixed top-16 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
              t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Danh sách học viên — padding bottom để không bị footer che */}
      <div className="space-y-3 pb-24">
        {sortedStudents.map((student) => {
          const currentStatus = statuses[student.enrollment_id]
          const isLoading = loading[student.enrollment_id]
          const isMarked = currentStatus !== null

          return (
            <div
              key={student.enrollment_id}
              className={`bg-white dark:bg-gray-800 rounded-xl px-4 py-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-opacity duration-200 ${isMarked ? 'opacity-75' : ''}`}
            >
              {/* Thông tin học viên */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-flame/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-flame font-bold text-sm">
                    {student.contact_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink dark:text-gray-100 truncate">{student.contact_name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{student.contact_phone}</p>
                </div>
                {isLoading && (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-flame animate-spin flex-shrink-0" />
                )}
              </div>

              {/* 4 nút trạng thái — tối thiểu 44px, full label */}
              <div className="grid grid-cols-4 gap-1.5">
                {STATUS_ORDER.map((status) => {
                  const cfg = STATUS_CONFIG[status]
                  const isActive = currentStatus === status
                  return (
                    <button
                      key={status}
                      onClick={() => handleMark(student.enrollment_id, status)}
                      disabled={isLoading}
                      className={`min-h-[44px] rounded-lg border text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 ${
                        isActive ? cfg.active : cfg.inactive
                      }`}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer sticky — tóm tắt realtime, nằm trên CnlBottomNav (bottom-14 = 56px) */}
      <div className="fixed bottom-14 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2.5 z-10 shadow-md">
        <div className="flex items-center justify-center gap-3 text-xs flex-wrap">
          <span className="text-green-600 font-semibold">Có mặt: {summary.present}</span>
          <span className="text-gray-300">·</span>
          <span className="text-amber-500 font-semibold">Trễ: {summary.late}</span>
          <span className="text-gray-300">·</span>
          <span className="text-blue-500 font-semibold">Về sớm: {summary.leave_early}</span>
          <span className="text-gray-300">·</span>
          <span className="text-red-600 font-semibold">Vắng: {summary.absent}</span>
          {summary.unmarked > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-gray-400 font-semibold">Chưa điểm: {summary.unmarked}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
