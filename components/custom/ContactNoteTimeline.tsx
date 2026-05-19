'use client'

import { useState } from 'react'

export type ContactNote = {
  id: string
  content: string
  created_at: string
  updated_at: string
  created_by: { id: string; full_name: string }
}

interface Props {
  contactId: string
  initialNotes: ContactNote[]
  currentUserId: string
  isAdmin: boolean
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

export default function ContactNoteTimeline({ contactId, initialNotes, currentUserId, isAdmin }: Props) {
  const [notes, setNotes] = useState<ContactNote[]>(initialNotes)
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!newContent.trim()) return
    setAdding(true)
    setError('')

    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Có lỗi xảy ra')
        return
      }

      const note: ContactNote = await res.json()
      // Optimistic update — thêm note mới lên đầu list
      setNotes((prev) => [note, ...prev])
      setNewContent('')
    } catch {
      setError('Không kết nối được máy chủ')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (note: ContactNote) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleEdit = async (noteId: string) => {
    if (!editContent.trim()) return

    try {
      const res = await fetch(`/api/contacts/${contactId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      })

      if (!res.ok) return

      const updated: ContactNote = await res.json()
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)))
      setEditingId(null)
    } catch {
      // Keep in edit mode on failure
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Xóa ghi chú này?')) return

    try {
      const res = await fetch(`/api/contacts/${contactId}/notes/${noteId}`, { method: 'DELETE' })
      if (!res.ok) return
      // Optimistic remove
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch {
      // ignore
    }
  }

  return (
    <div>
      {/* Form thêm ghi chú mới */}
      <div className="mb-5">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame resize-none"
          placeholder="Thêm ghi chú về contact này..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd()
          }}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={adding || !newContent.trim()}
          className="mt-2 bg-flame text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-flame/90 transition-colors disabled:opacity-40 min-h-[40px]"
        >
          {adding ? 'Đang lưu...' : 'Thêm ghi chú'}
        </button>
      </div>

      {/* Timeline ghi chú */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Chưa có ghi chú nào</div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const isOwn = note.created_by.id === currentUserId
            const canEdit = isAdmin || isOwn
            const canDelete = isAdmin
            const isEditing = editingId === note.id

            return (
              <div key={note.id} className="flex gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">
                    {note.created_by.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-ink">{note.created_by.full_name}</span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(note.created_at)}</span>
                    {note.updated_at !== note.created_at && (
                      <span className="text-xs text-gray-300">(đã sửa)</span>
                    )}
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full border border-flame/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={() => handleEdit(note.id)}
                          className="text-xs font-semibold text-flame hover:underline"
                        >
                          Lưu
                        </button>
                        <button onClick={cancelEdit} className="text-xs text-gray-400 hover:underline">
                          Huỷ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-ink whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2.5">
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
