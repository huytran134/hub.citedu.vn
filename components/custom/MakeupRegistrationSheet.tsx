'use client'

import { useState, useEffect, useCallback } from 'react'

type AvailableSession = {
  id: string
  class_id: string
  class_name: string
  session_number: number
  title: string | null
  scheduled_at: string
  lesson_match: boolean
}

type Props = {
  enrollmentId: string
  originalSessionId: string
  studentName: string
  onClose: () => void
  onSuccess: () => void
}

export default function MakeupRegistrationSheet({
  enrollmentId,
  originalSessionId,
  studentName,
  onClose,
  onSuccess,
}: Props) {
  const [sessions, setSessions] = useState<AvailableSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/makeup-sessions/available?enrollment_id=${enrollmentId}&original_session_id=${originalSessionId}`,
      )
      if (!res.ok) throw new Error('Không tải được danh sách buổi bù')
      const data = await res.json()
      setSessions(data)
    } catch {
      setError('Không tải được danh sách buổi bù. Thử lại.')
    } finally {
      setLoading(false)
    }
  }, [enrollmentId, originalSessionId])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  async function handleSubmit() {
    if (!selectedId) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/makeup-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          original_session_id: originalSessionId,
          makeup_session_id: selectedId,
          note: note.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Đăng ký thất bại')
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl pb-safe">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        <div className="px-4 pt-2 pb-6 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-ink dark:text-gray-100 text-base">
                Đăng ký học bù
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{studentName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Bước 1: Chọn buổi bù */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Chọn buổi học bù
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-flame animate-spin" />
                Đang tải…
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-sm">
                Không tìm thấy buổi học phù hợp trong tương lai
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => {
                  const date = new Date(s.scheduled_at)
                  const dateStr = date.toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const isSelected = selectedId === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl border-2 transition-all min-h-[56px] ${
                        isSelected
                          ? 'border-flame bg-flame/5'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-flame/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            isSelected
                              ? 'border-flame'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-flame" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink dark:text-gray-100 truncate">
                            {s.class_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Buổi #{s.session_number}
                            {s.title ? ` — ${s.title}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>
                          {s.lesson_match && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              Cùng bài
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ghi chú (tùy chọn) */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lý do vắng, dặn dò CNL lớp bù…"
              rows={2}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink dark:text-gray-100 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-flame/40 placeholder:text-gray-400"
            />
          </div>

          {/* Nút xác nhận */}
          <button
            onClick={handleSubmit}
            disabled={!selectedId || submitting}
            className="w-full min-h-[48px] rounded-xl bg-flame text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Đang đăng ký…
              </>
            ) : (
              'Xác nhận đăng ký bù'
            )}
          </button>
        </div>
      </div>
    </>
  )
}
