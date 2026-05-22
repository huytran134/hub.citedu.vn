'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface SessionRow {
  id: string
  session_number: number
  title: string | null
  scheduled_at: string
  duration_min: number
  material_url: string | null
  session_zoom_link: string | null
  notes: string | null
  is_completed: boolean
  attendance_count: number
}

interface PreviewSession {
  session_number: number
  scheduled_at: string
}

const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 0, label: 'CN' },
]

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

function toLocalDatetimeValue(iso: string) {
  // Chuyển ISO → "YYYY-MM-DDTHH:MM" cho input type="datetime-local"
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getSessionStatus(scheduledAt: string) {
  const now = new Date()
  const date = new Date(scheduledAt)
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  if (isToday) return { label: 'Hôm nay', color: 'bg-flame/10 text-flame' }
  if (date < now) return { label: 'Đã qua', color: 'bg-gray-100 text-gray-500' }
  return { label: 'Sắp tới', color: 'bg-green-100 text-green-700' }
}

// ─── Dialog tạo lịch tự động ─────────────────────────────────────────────────

function ScheduleDialog({
  classId,
  existingCount,
  onClose,
  onCreated,
}: {
  classId: string
  existingCount: number
  onClose: () => void
  onCreated: () => void
}) {
  const [startDateDisplay, setStartDateDisplay] = useState('')  // DD/MM/YYYY
  const [startDate, setStartDate] = useState('')               // YYYY-MM-DD gửi lên API
  const [startTime, setStartTime] = useState('08:00')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [totalSessions, setTotalSessions] = useState(20)
  const [preview, setPreview] = useState<PreviewSession[] | null>(null)
  const [isPreviewing, startPreview] = useTransition()
  const [isCreating, startCreate] = useTransition()
  const [error, setError] = useState('')

  function handleDateInput(raw: string) {
    // Chỉ giữ chữ số, tự thêm "/" sau 2 ký tự và 5 ký tự
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 4) formatted = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
    else if (digits.length > 2) formatted = `${digits.slice(0,2)}/${digits.slice(2)}`
    setStartDateDisplay(formatted)
    setPreview(null)
    // Parse DD/MM/YYYY → YYYY-MM-DD khi đủ 8 chữ số
    if (digits.length === 8) {
      const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4)
      setStartDate(`${y}-${m}-${d}`)
    } else {
      setStartDate('')
    }
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
    setPreview(null) // reset preview khi thay đổi
  }

  function handlePreview() {
    setError('')
    if (!startDate) return setError('Vui lòng nhập ngày bắt đầu theo định dạng DD/MM/YYYY')
    if (!selectedDays.length) return setError('Vui lòng chọn ít nhất 1 thứ trong tuần')
    if (!totalSessions || totalSessions < 1) return setError('Số buổi phải ít nhất là 1')

    startPreview(async () => {
      const res = await fetch(`/api/admin/classes/${classId}/sessions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, weekdays: selectedDays, startTime, totalSessions }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error ?? 'Lỗi khi tạo preview')
      setPreview(data.sessions)
    })
  }

  function handleCreate() {
    if (!preview?.length) return
    setError('')

    startCreate(async () => {
      const res = await fetch(`/api/admin/classes/${classId}/sessions/bulk-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions: preview }),
      })
      let data: { error?: string } = {}
      try { data = await res.json() } catch { /* empty body */ }
      if (!res.ok) return setError(data.error ?? 'Lỗi khi tạo lịch')
      onCreated()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Tạo lịch học tự động</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-ink transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Ngày bắt đầu */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Ngày bắt đầu</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/YYYY"
              value={startDateDisplay}
              onChange={(e) => handleDateInput(e.target.value)}
              maxLength={10}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          {/* Giờ bắt đầu */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Giờ bắt đầu</label>
            <select
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); setPreview(null) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            >
              {Array.from({ length: 28 }, (_, i) => {
                const totalMinutes = 420 + i * 30 // từ 07:00, bước 30 phút, đến 21:00
                const h = Math.floor(totalMinutes / 60)
                const m = totalMinutes % 60
                const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                return <option key={val} value={val}>{val}</option>
              })}
            </select>
          </div>

          {/* Thứ trong tuần */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Học vào các thứ</label>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAY_LABELS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-colors ${
                    selectedDays.includes(value)
                      ? 'bg-flame text-white border-flame'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-flame/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Số buổi */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Tổng số buổi học
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={totalSessions}
              onChange={(e) => { setTotalSessions(Number(e.target.value)); setPreview(null) }}
              className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Preview */}
          {preview && (
            <div>
              <p className="text-sm font-medium text-ink mb-2">
                Xem trước — {preview.length} buổi
              </p>
              <div className="border border-gray-100 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Buổi</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Ngày giờ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.map((s) => (
                      <tr key={s.session_number}>
                        <td className="px-3 py-2 font-medium text-ink">#{s.session_number}</td>
                        <td className="px-3 py-2 text-gray-600">{formatDateTime(s.scheduled_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-ink transition-colors"
          >
            Hủy
          </button>
          {!preview ? (
            <button
              onClick={handlePreview}
              disabled={isPreviewing}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-ink text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isPreviewing ? 'Đang tính...' : 'Xem trước'}
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-5 py-2 bg-flame hover:bg-flame/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Đang tạo...' : `Xác nhận tạo ${preview.length} buổi`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Dialog thêm 1 buổi lẻ ───────────────────────────────────────────────────

function AddSingleSessionDialog({
  classId,
  nextSessionNumber,
  onClose,
  onCreated,
}: {
  classId: string
  nextSessionNumber: number
  onClose: () => void
  onCreated: () => void
}) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [title, setTitle] = useState('')
  const [isSubmitting, startSubmit] = useTransition()
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!scheduledAt) return setError('Vui lòng chọn ngày giờ')
    setError('')

    startSubmit(async () => {
      const res = await fetch(`/api/admin/classes/${classId}/sessions/bulk-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessions: [{ session_number: nextSessionNumber, scheduled_at: new Date(scheduledAt).toISOString(), title: title || null }],
        }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error ?? 'Lỗi khi thêm buổi')
      onCreated()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Thêm buổi #{nextSessionNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Ngày & giờ học</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Tên bài học <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Buổi ${nextSessionNumber}`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-ink transition-colors">Hủy</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-flame hover:bg-flame/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Đang thêm...' : 'Thêm buổi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dialog sửa buổi học ─────────────────────────────────────────────────────

function EditSessionDialog({
  session,
  onClose,
  onSaved,
}: {
  session: SessionRow
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(session.title ?? '')
  const [scheduledAt, setScheduledAt] = useState(toLocalDatetimeValue(session.scheduled_at))
  const [durationMin, setDurationMin] = useState(session.duration_min)
  const [materialUrl, setMaterialUrl] = useState(session.material_url ?? '')
  const [isSaving, startSave] = useTransition()
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    startSave(async () => {
      const res = await fetch(`/api/admin/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_min: durationMin,
          material_url: materialUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error ?? 'Lỗi khi lưu')
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Sửa buổi #{session.session_number}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Tên bài học</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Buổi ${session.session_number}`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Ngày & giờ học</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Thời lượng (phút)</label>
            <input
              type="number"
              min={30}
              max={480}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="w-32 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Link tài liệu <span className="text-gray-400 font-normal">(Google Drive, YouTube...)</span></label>
            <input
              type="url"
              value={materialUrl}
              onChange={(e) => setMaterialUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>

          {/* Readonly fields — CNL manages these */}
          {(session.session_zoom_link || session.notes) && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Do CNL quản lý</p>
              {session.session_zoom_link && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Zoom:</span>{' '}
                  <a href={session.session_zoom_link} target="_blank" rel="noopener noreferrer" className="text-flame underline truncate">
                    {session.session_zoom_link}
                  </a>
                </p>
              )}
              {session.notes && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Ghi chú CNL:</span> {session.notes}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-ink transition-colors">Hủy</button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-flame hover:bg-flame/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Component chính ──────────────────────────────────────────────────────────

export default function AdminSessionsClient({
  classId,
  sessions: initialSessions,
  nextSessionNumber,
}: {
  classId: string
  sessions: SessionRow[]
  nextSessionNumber: number
}) {
  const router = useRouter()
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingSession, setEditingSession] = useState<SessionRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()

  const sessions = initialSessions
  const hasNoSessions = sessions.length === 0

  function refresh() {
    router.refresh()
  }

  function handleCreated() {
    setShowScheduleDialog(false)
    setShowAddDialog(false)
    refresh()
  }

  function handleSaved() {
    setEditingSession(null)
    refresh()
  }

  function handleDelete(session: SessionRow) {
    setDeleteError(null)
    if (session.attendance_count > 0) {
      setDeleteError(`Buổi #${session.session_number} đã có dữ liệu điểm danh, không thể xóa`)
      return
    }
    setDeletingId(session.id)
  }

  function confirmDelete() {
    if (!deletingId) return

    startDelete(async () => {
      const res = await fetch(`/api/admin/sessions/${deletingId}`, { method: 'DELETE' })
      const data = await res.json()
      setDeletingId(null)
      if (!res.ok) {
        setDeleteError(data.error ?? 'Lỗi khi xóa')
        return
      }
      refresh()
    })
  }

  return (
    <>
      {/* Trạng thái A — Chưa có buổi nào */}
      {hasNoSessions ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-gray-600 font-medium">Lớp này chưa có lịch học</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">Tạo lịch tự động theo thứ trong tuần, hoặc thêm từng buổi thủ công</p>
          <button
            onClick={() => setShowScheduleDialog(true)}
            className="bg-flame hover:bg-flame/90 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Tạo lịch tự động
          </button>
        </div>
      ) : (
        /* Trạng thái B — Đã có buổi học */
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{sessions.length} buổi học</p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="text-sm font-semibold text-flame border border-flame/30 hover:bg-flame/5 px-4 py-2 rounded-lg transition-colors"
            >
              + Thêm buổi
            </button>
          </div>

          {deleteError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
              <p className="text-red-600 text-sm">{deleteError}</p>
              <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">×</button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Buổi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày giờ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Tên bài</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Tài liệu</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((session) => {
                  const status = getSessionStatus(session.scheduled_at)
                  return (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-ink text-sm">#{session.session_number}</span>
                        {session.duration_min !== 120 && (
                          <span className="text-xs text-gray-400 ml-1.5">{session.duration_min}p</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-ink">{formatDate(session.scheduled_at)}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(session.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          {session.duration_min && ` · ${session.duration_min} phút`}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-gray-700">
                          {session.title
                            ? session.title
                            : <span className="text-gray-300 italic">Chưa đặt tên</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {session.material_url ? (
                          <a
                            href={session.material_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-flame underline"
                          >
                            Xem tài liệu
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        {session.is_completed && (
                          <span className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Đã dạy</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingSession(session)}
                            className="text-xs font-medium text-gray-500 hover:text-ink border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Sửa
                          </button>
                          {session.attendance_count === 0 && (
                            <button
                              onClick={() => handleDelete(session)}
                              className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-ink text-lg mb-2">Xóa buổi học?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Hành động này không thể hoàn tác. Buổi học sẽ bị xóa khỏi lịch.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-ink"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa buổi học'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showScheduleDialog && (
        <ScheduleDialog
          classId={classId}
          existingCount={sessions.length}
          onClose={() => setShowScheduleDialog(false)}
          onCreated={handleCreated}
        />
      )}

      {showAddDialog && (
        <AddSingleSessionDialog
          classId={classId}
          nextSessionNumber={nextSessionNumber}
          onClose={() => setShowAddDialog(false)}
          onCreated={handleCreated}
        />
      )}

      {editingSession && (
        <EditSessionDialog
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
