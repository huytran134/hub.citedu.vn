export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import CreateProgramDialog from './CreateProgramDialog'

const BRANCH_LABEL: Record<string, string> = {
  tu_duy: 'Tư duy',
  coaching: 'Coaching 1-1',
  ky_nang: 'Kỹ năng bổ trợ',
}

const BRANCH_COLOR: Record<string, string> = {
  tu_duy: 'bg-[#0a1a3d] text-[#7fb8f5] border border-[#1a3a6a]',
  coaching: 'bg-[#2a1a0a] text-[#f5a623] border border-[#5a3510]',
  ky_nang: 'bg-[#0a2d1a] text-[#3ecf8e] border border-[#145a30]',
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Bài giảng</h1>
          <p className="text-gray-500 text-sm mt-1">Chọn chương trình để quản lý nội dung bài giảng</p>
        </div>
        <CreateProgramDialog />
      </div>

      {programs.length === 0 ? (
        <div className="bg-[#0d1c33] border border-[#1e3060] rounded-xl p-12 text-center shadow-sm">
          <p className="text-[#6b7fa3]">Chưa có chương trình nào. Tạo chương trình trước rồi quay lại đây.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Link
              key={program.id}
              href={`/classes/lessons/${program.id}`}
              className="bg-[#0d1c33] border border-[#1e3060] rounded-xl p-5 shadow-sm hover:border-flame/60 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BRANCH_COLOR[program.branch]}`}>
                  {BRANCH_LABEL[program.branch]}
                </span>
                {program.level && (
                  <span className="text-xs text-[#6b7fa3]">Cấp {program.level}</span>
                )}
              </div>

              <h2 className="font-bold text-[#e8edf5] group-hover:text-flame transition-colors mb-2">
                {program.name}
              </h2>

              {program.description && (
                <p className="text-sm text-[#94b0d6] line-clamp-2 mb-3">{program.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-[#6b7fa3] pt-3 border-t border-[#1e3060]">
                <span>
                  {program._count.lessons} / {program.sessions_count ?? '?'} buổi đã nhập
                </span>
                <span className="text-flame font-semibold group-hover:underline">
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
