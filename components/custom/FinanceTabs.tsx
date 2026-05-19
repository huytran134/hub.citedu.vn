'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Phiếu thu', href: '/finance/payments' },
  { label: 'Lệnh hoàn tiền', href: '/finance/refunds' },
]

export default function FinanceTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-0 border-b border-gray-200 mb-6">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-flame text-flame'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
