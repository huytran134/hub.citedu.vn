'use client'

import { useState } from 'react'
import MakeupRegistrationSheet from './MakeupRegistrationSheet'

export type AbsentStudent = {
  enrollment_id: string
  contact_name: string
  has_makeup: boolean
  makeup_id?: string
}

type Props = {
  sessionId: string
  students: AbsentStudent[]
}

export default function AbsentWithMakeupList({ sessionId, students }: Props) {
  const [sheetFor, setSheetFor] = useState<AbsentStudent | null>(null)
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(
    () => new Set(students.filter((s) => s.has_makeup).map((s) => s.enrollment_id)),
  )

  if (students.length === 0) return null

  return (
    <>
      <div className="mt-5 mb-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold text-ink dark:text-gray-100">
            Vắng hôm nay
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold">
            {students.length}
          </span>
        </div>

        <div className="space-y-2">
          {students.map((student) => {
            const hasMakeup = registeredIds.has(student.enrollment_id)
            return (
              <div
                key={student.enrollment_id}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 dark:text-red-400 font-bold text-xs">
                    {student.contact_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink dark:text-gray-100 truncate">
                    {student.contact_name}
                  </p>
                  {hasMakeup && (
                    <p className="text-xs text-blue-500 mt-0.5">Đã có lịch bù</p>
                  )}
                </div>
                {!hasMakeup ? (
                  <button
                    onClick={() => setSheetFor(student)}
                    className="flex-shrink-0 min-h-[36px] px-3 rounded-lg bg-flame text-white text-xs font-semibold"
                  >
                    Đăng ký bù
                  </button>
                ) : (
                  <span className="flex-shrink-0 px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                    Đã đăng ký
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {sheetFor && (
        <MakeupRegistrationSheet
          enrollmentId={sheetFor.enrollment_id}
          originalSessionId={sessionId}
          studentName={sheetFor.contact_name}
          onClose={() => setSheetFor(null)}
          onSuccess={() => {
            setRegisteredIds((prev) => new Set([...prev, sheetFor.enrollment_id]))
            setSheetFor(null)
          }}
        />
      )}
    </>
  )
}
