'use client'

import { useState } from 'react'

interface Props {
  sessionId: string
  initialValue: string | null
}

// Textarea để CNL ghi chú sau buổi học — lưu khi bấm nút
export default function SessionNotesInput({ sessionId, initialValue }: Props) {
  const [value, setValue] = useState(initialValue ?? '')
  const [savedValue, setSavedValue] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)

  const isDirty = value.trim() !== savedValue

  const handleSave = async () => {
    if (!isDirty) return

    setSaving(true)
    try {
      const res = await fetch(`/api/cnl/sessions/${sessionId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value.trim() || null }),
      })
      if (!res.ok) throw new Error()
      setSavedValue(value.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
        Ghi chú buổi học
      </label>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nhận xét sau buổi học, nội dung cần nhắc, thông báo học viên..."
        rows={3}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-flame/50 focus:ring-1 focus:ring-flame/20 resize-none"
      />
      <button
        onClick={handleSave}
        disabled={saving || !isDirty}
        className="mt-2 w-full min-h-[44px] bg-flame text-white text-sm font-semibold rounded-lg disabled:opacity-40 transition-opacity active:scale-95"
      >
        {saving ? 'Đang lưu...' : isDirty ? 'Lưu ghi chú' : '✓ Đã lưu'}
      </button>
    </div>
  )
}
