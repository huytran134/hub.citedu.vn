'use client'

import { useState } from 'react'

interface Props {
  sessionId: string
  initialValue: string | null
}

// Input inline để CNL nhập link Zoom/Meet cho buổi sắp tới
// Auto-save khi blur khỏi ô nhập — không có nút Submit riêng
export default function SessionZoomLinkInput({ sessionId, initialValue }: Props) {
  const [value, setValue] = useState(initialValue ?? '')
  const [savedValue, setSavedValue] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)

  const handleBlur = async () => {
    const trimmed = value.trim()
    if (trimmed === savedValue) return // Không thay đổi → không cần gọi API

    setSaving(true)
    try {
      await fetch(`/api/cnl/sessions/${sessionId}/zoom-link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoom_link: trimmed || null }),
      })
      setSavedValue(trimmed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2">
      <label className="text-xs text-gray-400 mb-1 block">Link Zoom/Meet</label>
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="https://zoom.us/j/... hoặc meet.google.com/..."
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-flame/50 focus:ring-1 focus:ring-flame/20 min-h-[44px]"
      />
      {saving && <p className="text-xs text-gray-400 mt-1">Đang lưu...</p>}
      {!saving && savedValue && savedValue === value.trim() && (
        <p className="text-xs text-green-600 mt-1">✓ Đã lưu</p>
      )}
    </div>
  )
}
