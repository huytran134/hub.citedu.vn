'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import type { User } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStage = 'new' | 'consulting' | 'won' | 'lost'

type LatestNote = {
  id: string
  next_followup_at: string | null
  contact_result: string
  created_at: string
}

export type KanbanLead = {
  id: string
  stage: LeadStage
  lost_reason: string | null
  created_at: string
  contact: { id: string; name: string; phone: string; source: string }
  assigned_to: { id: string; full_name: string } | null
  notes: LatestNote[]
  enrollments: { id: string; status: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<LeadStage, string> = {
  new: 'Mới',
  consulting: 'Đang tư vấn',
  won: 'Đã chốt',
  lost: 'Không chốt',
}

const STAGE_COLOR: Record<LeadStage, string> = {
  new: 'bg-[#1a1a2b] text-[#8899aa] border border-[#2a2a4a]',
  consulting: 'bg-[#3d2a0a] text-[#f5a623] border border-[#5a3d10]',
  won: 'bg-[#0a2d1a] text-[#3ecf8e] border border-[#145a30]',
  lost: 'bg-[#2d0a0a] text-[#e86c6c] border border-[#5a1515]',
}

const SOURCE_LABEL: Record<string, string> = {
  facebook: 'FB', website: 'Web', hys: 'HYS',
  referral: 'GT', event: 'SK', other: 'Khác',
}

const SOURCE_COLOR: Record<string, string> = {
  facebook: 'bg-[#0a1a3d] text-[#7fb8f5] border border-[#1a2a5a]',
  website: 'bg-[#1a0a3d] text-[#b8a8f5] border border-[#2a1a5a]',
  hys: 'bg-[#0a2d1a] text-[#3ecf8e] border border-[#145a30]',
  referral: 'bg-[#3d2a0a] text-[#f5a623] border border-[#5a3d10]',
  event: 'bg-[#2d0a2a] text-[#e86cb8] border border-[#5a154a]',
  other: 'bg-[#1a1a2b] text-[#8899aa] border border-[#2a2a4a]',
}

const LOST_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'no_money', label: 'Không có tiền' },
  { value: 'no_time', label: 'Không có thời gian' },
  { value: 'wrong_fit', label: 'Không phù hợp' },
  { value: 'competitor', label: 'Chọn đơn vị khác' },
  { value: 'dislike_teacher', label: 'Không thích giảng viên' },
  { value: 'not_ready', label: 'Chưa sẵn sàng' },
  { value: 'other', label: 'Lý do khác' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

  if (diffDays === 0) return 'Hôm nay'
  if (diffDays === 1) return 'Hôm qua'
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

function getFollowupBadge(note: LatestNote | undefined): {
  label: string; color: string
} | null {
  if (!note) return null
  if (note.contact_result !== 'callback_needed') return null
  if (!note.next_followup_at) return null

  const d = new Date(note.next_followup_at)
  const now = new Date()
  const isOverdue = d < now
  const isToday = d.toDateString() === now.toDateString()

  return {
    label: `Gọi lại: ${d.toLocaleDateString('vi-VN')}`,
    color: isOverdue
      ? 'bg-[#2d0a0a] text-[#e86c6c] border border-[#5a1515]'
      : isToday
        ? 'bg-[#3d2a0a] text-[#f5a623] border border-[#5a3d10]'
        : 'bg-[#1a1a2b] text-[#8899aa] border border-[#2a2a4a]',
  }
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  onDragStart,
}: {
  lead: KanbanLead
  onDragStart: (leadId: string) => void
}) {
  const followup = getFollowupBadge(lead.notes[0])

  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead.id)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing select-none"
    >
      {/* Name + source */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <Link
          href={`/admin/leads/${lead.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-sm text-[#7fb8f5] hover:text-[#b8d8ff] hover:underline underline-offset-2 transition-colors leading-tight"
        >
          {lead.contact.name}
        </Link>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${SOURCE_COLOR[lead.contact.source] ?? 'bg-[#1a1a2b] text-[#8899aa] border border-[#2a2a4a]'}`}>
          {SOURCE_LABEL[lead.contact.source] ?? lead.contact.source}
        </span>
      </div>

      {/* Phone */}
      <p className="text-xs text-[#6b7fa3] mb-2">{lead.contact.phone}</p>

      {/* Followup badge */}
      {followup && (
        <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mb-2 ${followup.color}`}>
          {followup.label}
        </div>
      )}

      {/* Footer: assigned + date */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-[10px] text-[#6b7fa3]">
          {lead.assigned_to ? lead.assigned_to.full_name : '—'}
        </span>
        <span className="text-[10px] text-[#6b7fa3]">{formatRelativeDate(lead.created_at)}</span>
      </div>
    </div>
  )
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  isCollapsed,
  onToggleCollapse,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  stage: LeadStage
  leads: KanbanLead[]
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onDragStart: (leadId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (stage: LeadStage) => void
}) {
  const collapsible = stage === 'won' || stage === 'lost'

  const HEADER_COLOR: Record<LeadStage, string> = {
    new: 'border-gray-300',
    consulting: 'border-amber-400',
    won: 'border-green-500',
    lost: 'border-red-400',
  }

  return (
    <div
      className="flex-1 min-w-[250px] max-w-[300px]"
      onDragOver={onDragOver}
      onDrop={() => onDrop(stage)}
    >
      {/* Column header */}
      <div
        className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${HEADER_COLOR[stage]}`}
        onClick={collapsible ? onToggleCollapse : undefined}
        style={collapsible ? { cursor: 'pointer' } : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#c8d8f0]">{STAGE_LABEL[stage]}</span>
          <span className="text-xs bg-[#1a1a2b] text-[#6b7fa3] border border-[#2a2a4a] rounded-full px-2 py-0.5 font-medium">
            {leads.length}
          </span>
        </div>
        {collapsible && (
          <span className="text-[#6b7fa3] text-xs">{isCollapsed ? '▶ Mở' : '▼ Thu'}</span>
        )}
      </div>

      {/* Cards */}
      {(!collapsible || !isCollapsed) && (
        <div className="space-y-2.5 min-h-[80px]">
          {leads.length === 0 ? (
            <div className="text-center py-6 text-gray-300 text-xs border-2 border-dashed border-gray-100 rounded-xl">
              Kéo card vào đây
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Lead Modal ────────────────────────────────────────────────────────────

function AddLeadModal({
  users,
  onClose,
  onCreated,
}: {
  users: Pick<User, 'id' | 'full_name'>[]
  onClose: () => void
  onCreated: (lead: KanbanLead) => void
}) {
  const [phone, setPhone] = useState('')
  const [contactId, setContactId] = useState('')
  const [contactName, setContactName] = useState('')
  const [searching, setSearching] = useState(false)
  const [assignedTo, setAssignedTo] = useState('')
  const [initialNote, setInitialNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const searchContact = async () => {
    if (!phone.trim()) return
    setSearching(true)
    setContactId('')
    setContactName('')
    setError('')

    try {
      const res = await fetch(`/api/contacts/check-phone?phone=${encodeURIComponent(phone.trim())}`)
      const data = await res.json()
      if (data.exists && data.contact) {
        setContactId(data.contact.id)
        setContactName(data.contact.name)
      } else {
        setError('Không tìm thấy Contact với SĐT này. Hãy tạo Contact trước.')
      }
    } catch {
      setError('Không kết nối được máy chủ')
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!contactId) { setError('Vui lòng tìm và xác nhận Contact trước'); return }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          assigned_to_id: assignedTo || undefined,
          initial_note: initialNote || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Có lỗi xảy ra')
        return
      }

      const lead = await res.json()
      onCreated(lead)
      onClose()
    } catch {
      setError('Không kết nối được máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-ink dark:text-gray-100">Thêm Lead mới</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
          </div>

          {/* Tìm contact theo SĐT */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Tìm Contact theo SĐT</label>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchContact()}
                type="tel"
                placeholder="0912345678"
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
              />
              <button
                onClick={searchContact}
                disabled={searching}
                className="bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-navy/90 disabled:opacity-50 min-h-[44px]"
              >
                {searching ? '...' : 'Tìm'}
              </button>
            </div>
            {contactId && (
              <p className="text-xs text-green-600 font-medium mt-1.5">✓ {contactName}</p>
            )}
            {error && !contactId && (
              <div className="mt-2">
                <p className="text-xs text-red-600">{error}</p>
                <Link
                  href="/admin/contacts/new"
                  className="text-xs text-flame hover:underline"
                >
                  → Tạo Contact mới
                </Link>
              </div>
            )}
          </div>

          {/* Phân công tư vấn viên */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Phân công cho</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            >
              <option value="">— Chưa phân công —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          {/* Ghi chú đầu tiên */}
          <div className="mb-5">
            <label className="block text-xs text-gray-500 mb-1">Ghi chú ban đầu (tùy chọn)</label>
            <textarea
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              rows={2}
              placeholder="Nguồn từ đâu, quan tâm khóa gì..."
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame resize-none"
            />
          </div>

          {error && contactId && <p className="text-xs text-red-600 mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 dark:border-gray-600 text-sm font-semibold rounded-lg py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
            >
              Huỷ
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !contactId}
              className="flex-1 bg-flame text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-flame/90 transition-colors disabled:opacity-40 min-h-[44px]"
            >
              {submitting ? 'Đang tạo...' : 'Tạo Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Lost Reason Modal ────────────────────────────────────────────────────────

function LostReasonModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (reason: string, note: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <h2 className="text-lg font-bold text-ink dark:text-gray-100 mb-1">Lý do không chốt</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Chọn lý do để ghi nhận vào hệ thống</p>

          <div className="mb-4">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            >
              <option value="">— Chọn lý do —</option>
              {LOST_REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {reason === 'other' && (
            <div className="mb-4">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Mô tả thêm lý do..."
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame resize-none"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-sm font-semibold rounded-lg py-2.5 text-gray-600 hover:bg-gray-50 min-h-[44px]"
            >
              Huỷ
            </button>
            <button
              onClick={() => reason && onConfirm(reason, note)}
              disabled={!reason}
              className="flex-1 bg-red-600 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-red-700 disabled:opacity-40 min-h-[44px]"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Won Confirm Modal ─────────────────────────────────────────────────────────

function WonConfirmModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <h2 className="text-lg font-bold text-ink dark:text-gray-100 mb-1">Lead đã chốt ✓</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Tạo Enrollment để xếp học viên vào lớp học?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-sm font-semibold rounded-lg py-2.5 text-gray-600 hover:bg-gray-50 min-h-[44px]"
            >
              Để sau
            </button>
            <Link
              href="/classes"
              className="flex-1 bg-flame text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-flame/90 text-center flex items-center justify-center min-h-[44px]"
              onClick={onClose}
            >
              Vào Lớp học
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Board ────────────────────────────────────────────────────────────────

export default function LeadKanbanBoard({
  initialLeads,
  users,
}: {
  initialLeads: KanbanLead[]
  users: Pick<User, 'id' | 'full_name'>[]
}) {
  const [leads, setLeads] = useState<KanbanLead[]>(initialLeads)
  const [showWon, setShowWon] = useState(false)
  const [showLost, setShowLost] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [lostModalOpen, setLostModalOpen] = useState(false)
  const [wonModalOpen, setWonModalOpen] = useState(false)
  const draggingId = useRef<string | null>(null)

  const grouped = {
    new: leads.filter((l) => l.stage === 'new'),
    consulting: leads.filter((l) => l.stage === 'consulting'),
    won: leads.filter((l) => l.stage === 'won'),
    lost: leads.filter((l) => l.stage === 'lost'),
  }

  const handleDragStart = (leadId: string) => {
    draggingId.current = leadId
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetStage: LeadStage) => {
    const leadId = draggingId.current
    draggingId.current = null

    if (!leadId) return
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage === targetStage) return

    if (targetStage === 'lost') {
      // Phải chọn lý do trước khi chuyển
      draggingId.current = leadId
      setLostModalOpen(true)
      return
    }

    await moveToStage(leadId, targetStage, lead.stage)

    if (targetStage === 'won') {
      setWonModalOpen(true)
    }
  }

  const moveToStage = async (
    leadId: string,
    stage: LeadStage,
    previousStage: LeadStage,
    lostReason?: string,
    lostNote?: string,
  ) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage, ...(lostReason ? { lost_reason: lostReason } : {}) }
          : l,
      ),
    )

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          ...(lostReason && { lost_reason: lostReason, lost_note: lostNote }),
        }),
      })

      if (!res.ok) {
        // Revert on failure
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, stage: previousStage } : l)),
        )
      }
    } catch {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: previousStage } : l)),
      )
    }
  }

  const handleLostConfirm = async (reason: string, note: string) => {
    const leadId = draggingId.current
    draggingId.current = null
    if (!leadId) return

    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    setLostModalOpen(false)
    await moveToStage(leadId, 'lost', lead.stage, reason, note)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Pipeline Leads</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-flame text-white font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-flame/90 transition-colors min-h-[44px] flex items-center"
        >
          + Thêm Lead
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        <KanbanColumn
          stage="new"
          leads={grouped.new}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        <KanbanColumn
          stage="consulting"
          leads={grouped.consulting}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        <KanbanColumn
          stage="won"
          leads={grouped.won}
          isCollapsed={!showWon}
          onToggleCollapse={() => setShowWon((v) => !v)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        <KanbanColumn
          stage="lost"
          leads={grouped.lost}
          isCollapsed={!showLost}
          onToggleCollapse={() => setShowLost((v) => !v)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddLeadModal
          users={users}
          onClose={() => setShowAddModal(false)}
          onCreated={(lead) => {
            setLeads((prev) => [lead, ...prev])
          }}
        />
      )}

      {lostModalOpen && (
        <LostReasonModal
          onConfirm={handleLostConfirm}
          onClose={() => {
            draggingId.current = null
            setLostModalOpen(false)
          }}
        />
      )}

      {wonModalOpen && <WonConfirmModal onClose={() => setWonModalOpen(false)} />}
    </div>
  )
}
