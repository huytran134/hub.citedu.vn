'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Hôm nay', href: '/today' },
  { label: 'Lớp học', href: '/my-classes' },
  { label: 'Leads', href: '/leads' },
  { label: 'Điểm danh', href: '/attendance' },
]

export default function CnlBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex z-10">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            // Tối thiểu 44px height — WCAG AA cho mobile
            className={cn(
              'flex-1 flex items-center justify-center h-14 text-sm font-medium transition-colors',
              active ? 'text-flame' : 'text-gray-500 dark:text-gray-400 hover:text-flame',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
