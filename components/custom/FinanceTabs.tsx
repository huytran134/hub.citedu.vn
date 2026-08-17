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
    <div className="flex gap-0 border-b border-border mb-6">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-flame text-flame'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
