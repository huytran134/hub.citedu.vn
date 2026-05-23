export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import AddLessonForm from './AddLessonForm'

export default async function ProgramLessonsPage({ params }: { params: { programId: string } }) {
  await getCurrentUser()

  const program = await prisma.program.findUnique({
    where: { id: params.programId },
    include: {
      lessons: {
        include: {
          created_by: { select: { full_name: true } },
        },
        orderBy: { session_number: 'asc' },
      },
    },
  })

  if (!program) notFound()

  const totalSessions = program.sessions_count ?? 0
  const existingNumbers = new Set(program.lessons.map((l) => l.session_number))

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <Link href="/classes/lessons" className="text-[#6b7fa3] hover:text-[#94b0d6]">Bài giảng</Link>
        <span className="text-[#3a4d6a]">/</span>
        <span className="text-[#7fb8f5] font-medium">{program.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8471A]">{program.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {program.lessons.length} / {totalSessions || '?'} buổi đã nhập nội dung
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {totalSessions > 0 && (
        <div className="bg-[#0d1c33] rounded-xl p-4 border border-[#1e3060] mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#6b7fa3] font-medium">Tiến độ nhập bài giảng</span>
            <span className="text-flame font-semibold">
              {program.lessons.length}/{totalSessions} buổi
            </span>
          </div>
          <div className="h-2 bg-[#132540] rounded-full overflow-hidden">
            <div
              className="h-full bg-flame rounded-full transition-all"
              style={{ width: `${Math.min(100, (program.lessons.length / totalSessions) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Danh sách lesson */}
      <div className="bg-[#0d1c33] rounded-xl border border-[#1e3060] overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-[#1e3060]">
          <h2 className="font-semibold text-[#e8edf5]">Danh sách bài giảng</h2>
        </div>

        {program.lessons.length === 0 ? (
          <div className="px-5 py-10 text-center text-[#6b7fa3] text-sm">
            Chưa có bài giảng nào. Thêm buổi đầu tiên bên dưới.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#0a1628] border-b border-[#1e3060]">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-wider w-16">Buổi</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-wider">Tiêu đề</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-wider">Nội dung</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {program.lessons.map((lesson) => (
                <tr key={lesson.id} className="border-b border-[#132540] hover:bg-[#132540] transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#1a2d4a] text-[#7fb8f5] text-[13px] font-semibold">
                      {lesson.session_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#e8edf5] text-sm">{lesson.title}</p>
                    {lesson.objectives && (
                      <p className="text-[13px] text-[#6b7fa3] mt-0.5 line-clamp-1 leading-relaxed">{lesson.objectives}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lesson.content ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3ecf8e] bg-[#0a2d1a] border border-[#145a30] px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
                        Đã nhập
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#f5a623] bg-[#2b1a0a] border border-[#4d3010] px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />
                        Chưa có
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/classes/lessons/${program.id}/${lesson.id}`}
                      className="text-sm text-flame font-medium hover:underline"
                    >
                      {lesson.content ? 'Sửa' : 'Nhập nội dung'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form thêm buổi học mới */}
      <AddLessonForm
        programId={program.id}
        existingNumbers={Array.from(existingNumbers)}
        totalSessions={totalSessions}
      />
    </div>
  )
}
