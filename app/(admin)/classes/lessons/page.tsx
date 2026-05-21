export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'

const BRANCH_LABEL: Record<string, string> = {
  tu_duy: 'Tư duy',
  coaching: 'Coaching 1-1',
  ky_nang: 'Kỹ năng bổ trợ',
}

const BRANCH_COLOR: Record<string, string> = {
  tu_duy: 'bg-blue-100 text-blue-700',
  coaching: 'bg-purple-100 text-purple-700',
  ky_nang: 'bg-green-100 text-green-700',
}

export default async function LessonsProgramListPage() {
  await getCurrentUser()

  const programs = await prisma.program.findMany({
    include: {
      _count: { select: { lessons: true } },
    },
    orderBy: [{ branch: 'asc' }, { level: 'asc' }, { name: 'asc' }],
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Bài giảng</h1>
        <p className="text-gray-500 text-sm mt-1">Chọn chương trình để quản lý nội dung bài giảng</p>
      </div>

      {programs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Chưa có chương trình nào. Tạo chương trình trước rồi quay lại đây.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Link
              key={program.id}
              href={`/classes/lessons/${program.id}`}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-flame/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BRANCH_COLOR[program.branch]}`}>
                  {BRANCH_LABEL[program.branch]}
                </span>
                {program.level && (
                  <span className="text-xs text-gray-400">Cấp {program.level}</span>
                )}
              </div>

              <h2 className="font-semibold text-ink group-hover:text-flame transition-colors mb-2">
                {program.name}
              </h2>

              {program.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{program.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                <span>
                  {program._count.lessons} / {program.sessions_count ?? '?'} buổi đã nhập
                </span>
                <span className="text-flame font-medium group-hover:underline">
                  Quản lý →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
