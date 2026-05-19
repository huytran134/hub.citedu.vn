export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { ContactSource, LeadStage } from '@prisma/client'

const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook', website: 'Website', hys: 'HYS',
  referral: 'Giới thiệu', event: 'Sự kiện', other: 'Khác',
}
const STAGE_LABEL: Record<string, string> = {
  new: 'Mới', consulting: 'Đang tư vấn', won: 'Đã chốt', lost: 'Không chốt',
}
const STAGE_COLOR: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  consulting: 'bg-amber-100 text-amber-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
}

// Badge followup cho CNL — chỉ hiện nếu cần gọi lại
function FollowupBadge({ date }: { date: Date | null }) {
  if (!date) return null

  const now = new Date()
  const d = new Date(date)
  const isOverdue = d < now
  const isToday = d.toDateString() === now.toDateString()

  const color = isOverdue
    ? 'bg-red-100 text-red-600'
    : isToday
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-500'

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color}`}>
      Gọi lại: {d.toLocaleDateString('vi-VN')}
    </span>
  )
}

export default async function CnlLeadsPage({
  searchParams,
}: {
  searchParams: { search?: string; stage?: string; page?: string }
}) {
  const search = searchParams.search ?? ''
  const stage = (searchParams.stage ?? '') as LeadStage | ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const limit = 20

  const where: Record<string, unknown> = {
    ...(stage && { stage }),
    ...(search && {
      contact: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      },
    }),
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, phone: true, source: true } },
        assigned_to: { select: { full_name: true } },
        // Middleware không lọc nested — tường minh deleted_at: null
        notes: {
          where: {
            deleted_at: null,
            contact_result: 'callback_needed',
            next_followup_at: { not: null },
          },
          orderBy: { next_followup_at: 'asc' },
          take: 1,
          select: { next_followup_at: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  const buildUrl = (p: Record<string, string>) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (stage) params.set('stage', stage)
    Object.entries(p).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k) })
    return `?${params.toString()}`
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-ink uppercase tracking-wide">Leads</h1>
        <p className="text-sm text-gray-500">{total} leads</p>
      </div>

      {/* Search */}
      <form action="/leads" method="GET" className="px-4 mb-3">
        <div className="flex gap-2">
          <input
            name="search"
            type="text"
            defaultValue={search}
            placeholder="Tìm tên hoặc SĐT..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame min-h-[44px]"
          />
          {stage && <input type="hidden" name="stage" value={stage} />}
          <button
            type="submit"
            className="bg-navy text-white text-sm font-semibold rounded-lg px-4 min-h-[44px] hover:bg-navy/90"
          >
            Tìm
          </button>
        </div>
      </form>

      {/* Stage filter */}
      <div className="px-4 mb-4 flex gap-2 overflow-x-auto">
        {[
          { value: '', label: 'Tất cả' },
          { value: 'new', label: 'Mới' },
          { value: 'consulting', label: 'Đang tư vấn' },
          { value: 'won', label: 'Đã chốt' },
          { value: 'lost', label: 'Không chốt' },
        ].map((o) => (
          <Link
            key={o.value}
            href={buildUrl({ stage: o.value, page: '1' })}
            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors ${
              stage === o.value
                ? 'bg-flame text-white border-flame'
                : 'bg-white text-gray-600 border-gray-200 hover:border-flame/50'
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50">
        {leads.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">
            {search || stage ? 'Không tìm thấy lead nào' : 'Chưa có lead nào'}
          </div>
        ) : (
          leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="block px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm">{lead.contact.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{lead.contact.phone}</p>
                  {lead.assigned_to && (
                    <p className="text-xs text-gray-400 mt-0.5">TV: {lead.assigned_to.full_name}</p>
                  )}
                  {lead.notes[0]?.next_followup_at && (
                    <div className="mt-1.5">
                      <FollowupBadge date={lead.notes[0].next_followup_at} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STAGE_COLOR[lead.stage]}`}>
                    {STAGE_LABEL[lead.stage]}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {SOURCE_LABEL[lead.contact.source] ?? lead.contact.source}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4">
          {page > 1 ? (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="text-sm text-flame min-h-[44px] flex items-center"
            >
              ← Trước
            </Link>
          ) : <span />}
          <span className="text-xs text-gray-400">Trang {page}/{totalPages}</span>
          {page < totalPages ? (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="text-sm text-flame min-h-[44px] flex items-center"
            >
              Tiếp →
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  )
}
