'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

const SOURCE_OPTIONS = [
  { value: '', label: 'Tất cả nguồn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'website', label: 'Website' },
  { value: 'hys', label: 'HYS' },
  { value: 'referral', label: 'Giới thiệu' },
  { value: 'event', label: 'Sự kiện' },
  { value: 'other', label: 'Khác' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'lead', label: 'Lead' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'alumni', label: 'Cựu học viên' },
  { value: 'dropped', label: 'Bỏ học' },
]

interface Props {
  defaultSearch?: string
  defaultSource?: string
  defaultStatus?: string
}

export default function ContactSearchBar({
  defaultSearch = '',
  defaultSource = '',
  defaultStatus = '',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(defaultSearch)
  const debounceRef = useRef<NodeJS.Timeout>()

  const buildUrl = useCallback(
    (s: string, source: string, status: string) => {
      const params = new URLSearchParams()
      if (s) params.set('search', s)
      if (source) params.set('source', source)
      if (status) params.set('status', status)
      params.set('page', '1')
      return `${pathname}?${params.toString()}`
    },
    [pathname],
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl(value, searchParams.get('source') ?? '', searchParams.get('status') ?? ''))
    }, 300)
  }

  const handleFilterChange = (key: 'source' | 'status', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        type="text"
        placeholder="Tìm theo tên hoặc SĐT..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
      />
      <select
        defaultValue={defaultSource}
        onChange={(e) => handleFilterChange('source', e.target.value)}
        className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
      >
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        defaultValue={defaultStatus}
        onChange={(e) => handleFilterChange('status', e.target.value)}
        className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
