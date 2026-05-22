'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type LeadStage = 'new' | 'consulting' | 'won' | 'lost'

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
  { value: 'new', label: 'Mới' },
  { value: 'consulting', label: 'Đang tư vấn' },
  { value: 'won', label: 'Đã chốt' },
  { value: 'lost', label: 'Không chốt' },
]

const LOST_REASON_OPTIONS = [
  { value: 'no_money', label: 'Không có tiền' },
  { value: 'no_time', label: 'Không có thời gian' },
  { value: 'wrong_fit', label: 'Không phù hợp' },
  { value: 'competitor', label: 'Chọn đơn vị khác' },
  { value: 'dislike_teacher', label: 'Không thích giảng viên' },
  { value: 'not_ready', label: 'Chưa sẵn sàng' },
  { value: 'other', label: 'Lý do khác' },
]

export default function LeadStageControl({
  leadId,
  currentStage,
  currentAssignedToId,
  users,
}: {
  leadId: string
  currentStage: string
  currentAssignedToId: string | null
  users: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const [stage, setStage] = useState(currentStage)
  const [assignedTo, setAssignedTo] = useState(currentAssignedToId ?? '')
  const [pendingStage, setPendingStage] = useState<LeadStage | null>(null)
  const [lostReason, setLostReason] = useState('')
  const [lostNote, setLostNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleStageChange = (newStage: string) => {
    if (newStage === 'lost') {
      setPendingStage('lost')
      return
    }
    applyStage(newStage as LeadStage)
  }

  const applyStage = async (
    newStage: LeadStage,
    reason?: string,
    note?: string,
  ) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: newStage,
          ...(reason && { lost_reason: reason, lost_note: note }),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Có lỗi xảy ra')
        return
      }
      setStage(newStage)
      setPendingStage(null)
      setLostReason('')
      setLostNote('')
      router.refresh()
    } catch {
      setError('Không kết nối được máy chủ')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignChange = async (newAssignedTo: string) => {
    setAssignedTo(newAssignedTo)
    setSaving(true)
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_id: newAssignedTo || null }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Điều chỉnh</p>

      {/* Stage */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Trạng thái</label>
        <select
          value={stage}
          onChange={(e) => handleStageChange(e.target.value)}
          disabled={saving}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame disabled:opacity-60"
        >
          {STAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Lost Reason form — hiện inline khi chọn lost */}
      {pendingStage === 'lost' && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-xs font-semibold text-red-600 mb-3">Lý do không chốt (bắt buộc)</p>
          <select
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <option value="">— Chọn lý do —</option>
            {LOST_REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {lostReason === 'other' && (
            <textarea
              value={lostNote}
              onChange={(e) => setLostNote(e.target.value)}
              rows={2}
              placeholder="Mô tả thêm..."
              className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none resize-none"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setPendingStage(null)}
              className="flex-1 border border-gray-200 dark:border-gray-600 text-xs rounded-lg py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Huỷ
            </button>
            <button
              onClick={() => lostReason && applyStage('lost', lostReason, lostNote)}
              disabled={!lostReason || saving}
              className="flex-1 bg-red-600 text-white text-xs rounded-lg py-2 hover:bg-red-700 disabled:opacity-40"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

      {/* Assign */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Phân công cho</label>
        <select
          value={assignedTo}
          onChange={(e) => handleAssignChange(e.target.value)}
          disabled={saving}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame disabled:opacity-60"
        >
          <option value="">— Chưa phân công —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {saving && <p className="text-xs text-gray-400">Đang lưu...</p>}
    </div>
  )
}
