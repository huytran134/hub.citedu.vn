'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@prisma/client'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  badge?: number
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      className={cn(
        'relative px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
        isActive
          ? 'bg-white/20 text-white'
          : 'text-white/70 hover:text-white hover:bg-white/10',
      )}
    >
      {item.label}
      {item.badge != null && item.badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  )
}

export default function AdminNav({
  user,
  pendingPayments = 0,
  pendingRefunds = 0,
}: {
  user: User
  pendingPayments?: number
  pendingRefunds?: number
}) {
  const totalPending = pendingPayments + pendingRefunds

  const NAV_ITEMS: NavItem[] = [
    { label: 'Tổng quan', href: '/dashboard' },
    { label: 'Contacts', href: '/admin/contacts' },
    { label: 'Leads', href: '/admin/leads' },
    { label: 'Lớp học', href: '/classes' },
    { label: 'Tài chính', href: '/finance', badge: totalPending },
    { label: 'Báo cáo', href: '/reports' },
  ]

  return (
    <nav className="bg-navy text-white sticky top-0 z-10 shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-lg mr-4 text-white hover:text-white/80 flex-shrink-0">
          CiT Hub
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <span className="text-white/60 text-sm flex-shrink-0">{user.full_name}</span>
      </div>
    </nav>
  )
}
