'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function ClassesSectionTabs() {
  const pathname = usePathname()
  const isLessons = pathname.startsWith('/classes/lessons')

  const tabs = [
    { label: 'Danh sách lớp', href: '/classes', active: !isLessons },
    { label: 'Bài giảng', href: '/classes/lessons', active: isLessons },
  ]

  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab.active
              ? 'border-flame text-flame'
              : 'border-transparent text-gray-500 hover:text-ink hover:border-gray-300',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
