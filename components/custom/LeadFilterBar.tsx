'use client'

import { useRouter, usePathname } from 'next/navigation'

const SOURCE_OPTIONS = [
  { value: '', label: 'Tất cả nguồn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'website', label: 'Website' },
  { value: 'hys', label: 'HYS' },
  { value: 'referral', label: 'Giới thiệu' },
  { value: 'event', label: 'Sự kiện' },
  { value: 'other', label: 'Khác' },
]

// Build URL giữ nguyên các filter khác khi thay 1 giá trị
function buildParams(
  current: { search: string; assignedToId: string; source: string },
  update: { key: string; value: string },
) {
  const map: Record<string, string> = {}
  if (current.search) map.search = current.search
  if (current.assignedToId) map.assigned_to_id = current.assignedToId
  if (current.source) map.source = current.source
  if (update.value) {
    map[update.key] = update.value
  } else {
    delete map[update.key]
  }
  return new URLSearchParams(map).toString()
}

export default function LeadFilterBar({
  defaultSearch,
  defaultAssignedTo,
  defaultSource,
  users,
}: {
  defaultSearch: string
  defaultAssignedTo: string
  defaultSource: string
  users: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  const current = { search: defaultSearch, assignedToId: defaultAssignedTo, source: defaultSource }

  const go = (key: string, value: string) => {
    const qs = buildParams(current, { key, value })
    router.push(`${pathname}${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      {/* Search */}
      <input
        type="text"
        defaultValue={defaultSearch}
        placeholder="Tìm tên hoặc SĐT..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            go('search', (e.target as HTMLInputElement).value.trim())
          }
        }}
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v !== defaultSearch) go('search', v)
        }}
        className="bg-[#0d1c33] border border-[#2d4a7a] text-[#c8d8f0] rounded-lg px-4 py-2 text-sm placeholder:text-[#4a6080] focus:outline-none focus:ring-2 focus:ring-flame/40 focus:border-flame min-w-[200px]"
      />

      {/* Assigned to filter */}
      <select
        defaultValue={defaultAssignedTo}
        onChange={(e) => go('assigned_to_id', e.target.value)}
        className="bg-[#0d1c33] border border-[#2d4a7a] text-[#c8d8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/40 focus:border-flame"
      >
        <option value="">Tất cả tư vấn viên</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.full_name}</option>
        ))}
      </select>

      {/* Source filter */}
      <select
        defaultValue={defaultSource}
        onChange={(e) => go('source', e.target.value)}
        className="bg-[#0d1c33] border border-[#2d4a7a] text-[#c8d8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame/40 focus:border-flame"
      >
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
