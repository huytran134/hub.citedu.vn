'use client'

import { useState } from 'react'

export type LeadNote = {
  id: string
  content: string
  contact_method: string
  contact_result: string
  next_followup_at: string | null
  created_at: string
  updated_at: string
  created_by: { id: string; full_name: string }
}

interface Props {
  leadId: string
  initialNotes: LeadNote[]
  currentUserId: string
  isAdmin: boolean
}

const METHOD_LABEL: Record<string, string> = {
  call: 'Gọi điện', zalo: 'Zalo', meetup: 'Gặp mặt', email: 'Email', other: 'Khác',
}
const METHOD_COLOR: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700',
  zalo: 'bg-green-100 text-green-700',
  meetup: 'bg-purple-100 text-purple-700',
  email: 'bg-gray-100 text-gray-600',
  other: 'bg-gray-100 text-gray-500',
}
const RESULT_LABEL: Record<string, string> = {
  answered: 'Đã nghe', no_answer: 'Không bắt máy',
  callback_needed: 'Hẹn gọi lại', wrong_number: 'Sai số',
}
const RESULT_COLOR: Record<string, string> = {
  answered: 'bg-green-100 text-green-700',
  no_answer: 'bg-gray-100 text-gray-500',
  callback_needed: 'bg-amber-100 text-amber-700',
  wrong_number: 'bg-red-100 text-red-600',
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays === 1) return 'Hôm qua'
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

function formatDatetime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

export default function LeadNoteTimeline({ leadId, initialNotes, currentUserId, isAdmin }: Props) {
  const [notes, setNotes] = useState<LeadNote[]>(initialNotes)
  const [content, setContent] = useState('')
  const [contactMethod, setContactMethod] = useState('call')
  const [contactResult, setContactResult] = useState('answered')
  const [nextFollowup, setNextFollowup] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{
    content?: string
    contact_method?: string
    contact_result?: string
    next_followup_at?: string
  }>({})

  const showFollowup = contactResult === 'callback_needed'

  const handleAdd = async () => {
    if (!content.trim()) return
    setAdding(true)
    setError('')

    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          contact_method: contactMethod,
          contact_result: contactResult,
          next_followup_at: showFollowup && nextFollowup ? nextFollowup : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Có lỗi xảy ra')
        return
      }

      const note: LeadNote = await res.json()
      setNotes((prev) => [note, ...prev])
      setContent('')
      setContactMethod('call')
      setContactResult('answered')
      setNextFollowup('')
    } catch {
      setError('Không kết nối được máy chủ')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (note: LeadNote) => {
    setEditingId(note.id)
    setEditData({
      content: note.content,
      contact_method: note.contact_method,
      contact_result: note.contact_result,
      next_followup_at: note.next_followup_at
        ? new Date(note.next_followup_at).toISOString().slice(0, 16)
        : '',
    })
  }

  const handleEdit = async (noteId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editData.content,
          contact_method: editData.contact_method,
          contact_result: editData.contact_result,
          next_followup_at: editData.contact_result === 'callback_needed'
            ? editData.next_followup_at || null
            : null,
        }),
      })

      if (!res.ok) return

      const updated: LeadNote = await res.json()
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)))
      setEditingId(null)
    } catch {
      // Keep in edit mode
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Xóa ghi chú này?')) return
    try {
      const res = await fetch(`/api/leads/${leadId}/notes/${noteId}`, { method: 'DELETE' })
      if (!res.ok) return
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch {
      // ignore
    }
  }

  return (
    <div>
      {/* Form thêm ghi chú mới */}
      <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-sm font-semibold text-ink mb-3">Ghi nhật ký tư vấn</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hình thức</label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            >
              {Object.entries(METHOD_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Kết quả</label>
            <select
              value={contactResult}
              onChange={(e) => setContactResult(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            >
              {Object.entries(RESULT_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {showFollowup && (
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Gọi lại lúc (tùy chọn)</label>
            <input
              type="datetime-local"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            />
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame resize-none"
          placeholder="Nội dung buổi liên hệ..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd()
          }}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

        <button
          onClick={handleAdd}
          disabled={adding || !content.trim()}
          className="mt-2 bg-flame text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-flame/90 transition-colors disabled:opacity-40 min-h-[44px]"
        >
          {adding ? 'Đang lưu...' : 'Lưu ghi chú'}
        </button>
      </div>

      {/* Timeline */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Chưa có ghi chú nào</div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const isOwn = note.created_by.id === currentUserId
            const canEdit = isAdmin || isOwn
            const canDelete = isAdmin
            const isEditing = editingId === note.id
            const editShowFollowup = editData.contact_result === 'callback_needed'

            return (
              <div key={note.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">
                    {note.created_by.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-sm font-semibold text-ink">{note.created_by.full_name}</span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(note.created_at)}</span>
                    {note.updated_at !== note.created_at && (
                      <span className="text-xs text-gray-300">(đã sửa)</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${METHOD_COLOR[note.contact_method] ?? 'bg-gray-100 text-gray-500'}`}>
                      {METHOD_LABEL[note.contact_method] ?? note.contact_method}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RESULT_COLOR[note.contact_result] ?? 'bg-gray-100'}`}>
                      {RESULT_LABEL[note.contact_result] ?? note.contact_result}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={editData.contact_method ?? 'call'}
                          onChange={(e) => setEditData((d) => ({ ...d, contact_method: e.target.value }))}
                          className="border border-flame/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
                        >
                          {Object.entries(METHOD_LABEL).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                        <select
                          value={editData.contact_result ?? 'answered'}
                          onChange={(e) => setEditData((d) => ({ ...d, contact_result: e.target.value }))}
                          className="border border-flame/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
                        >
                          {Object.entries(RESULT_LABEL).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                      {editShowFollowup && (
                        <input
                          type="datetime-local"
                          value={editData.next_followup_at ?? ''}
                          onChange={(e) => setEditData((d) => ({ ...d, next_followup_at: e.target.value }))}
                          className="w-full border border-flame/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30"
                        />
                      )}
                      <textarea
                        value={editData.content ?? ''}
                        onChange={(e) => setEditData((d) => ({ ...d, content: e.target.value }))}
                        rows={3}
                        className="w-full border border-flame/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(note.id)}
                          className="text-xs font-semibold text-flame hover:underline"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:underline"
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {note.next_followup_at && note.contact_result === 'callback_needed' && (
                        <p className={`text-xs font-medium mb-1.5 ${
                          isOverdue(note.next_followup_at)
                            ? 'text-red-600'
                            : isToday(note.next_followup_at)
                              ? 'text-amber-600'
                              : 'text-gray-400'
                        }`}>
                          Gọi lại lúc: {formatDatetime(note.next_followup_at)}
                          {isOverdue(note.next_followup_at) ? ' — Đã quá hạn!' : ''}
                        </p>
                      )}
                      <p className="text-sm text-ink whitespace-pre-wrap bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                        {note.content}
                      </p>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-3 mt-1.5">
                          {canEdit && (
                            <button
                              onClick={() => startEdit(note)}
                              className="text-xs text-gray-400 hover:text-flame transition-colors"
                            >
                              Sửa
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(note.id)}
                              className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
