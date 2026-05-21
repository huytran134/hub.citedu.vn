'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SessionDetailTabs({
  classId,
  sessionId,
}: {
  classId: string
  sessionId: string
}) {
  const pathname = usePathname()
  const isAttendance = pathname.endsWith('/attendance')
  const isFeedback = pathname.endsWith('/feedback')

  const base = `/my-classes/${classId}/sessions/${sessionId}`

  return (
    <div className="flex gap-2 mb-5">
      <Link
        href={`${base}/attendance`}
        className={`flex-1 text-center text-sm font-semibold rounded-xl min-h-[44px] flex items-center justify-center transition-colors ${
          isAttendance
            ? 'bg-flame text-white shadow-sm'
            : 'bg-white border border-gray-200 text-gray-500 hover:border-flame/40 hover:text-flame'
        }`}
      >
        Điểm danh
      </Link>
      <Link
        href={`${base}/feedback`}
        className={`flex-1 text-center text-sm font-semibold rounded-xl min-h-[44px] flex items-center justify-center transition-colors ${
          isFeedback
            ? 'bg-flame text-white shadow-sm'
            : 'bg-white border border-gray-200 text-gray-500 hover:border-flame/40 hover:text-flame'
        }`}
      >
        Đánh giá
      </Link>
    </div>
  )
}
