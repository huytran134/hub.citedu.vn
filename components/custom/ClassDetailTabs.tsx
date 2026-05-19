'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  classId: string
  basePath?: string // '/my-classes' hoặc '/classes' (admin)
}

export default function ClassDetailTabs({ classId, basePath = '/my-classes' }: Props) {
  const pathname = usePathname()
  const isSessionsTab = pathname.includes('/sessions')

  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors min-h-[44px] flex items-center ${
        active
          ? 'border-flame text-flame'
          : 'border-transparent text-gray-500 hover:text-ink'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <div className="flex border-b border-gray-200 mb-5 -mx-0">
      {tab('Học viên', `${basePath}/${classId}`, !isSessionsTab)}
      {tab('Buổi học', `${basePath}/${classId}/sessions`, isSessionsTab)}
    </div>
  )
}
