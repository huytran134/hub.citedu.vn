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
          _count: { select: { versions: true } },
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
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/classes/lessons" className="hover:text-flame">Bài giảng</Link>
        <span>/</span>
        <span className="text-ink">{program.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">{program.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {program.lessons.length} / {totalSessions || '?'} buổi đã nhập nội dung
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {totalSessions > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Tiến độ nhập bài giảng</span>
            <span className="text-flame font-semibold">
              {program.lessons.length}/{totalSessions} buổi
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-flame rounded-full transition-all"
              style={{ width: `${Math.min(100, (program.lessons.length / totalSessions) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Danh sách lesson */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-ink">Danh sách bài giảng</h2>
        </div>

        {program.lessons.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            Chưa có bài giảng nào. Thêm buổi đầu tiên bên dưới.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Buổi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tiêu đề</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nội dung</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phiên bản</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {program.lessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-navy/10 text-navy text-sm font-bold">
                      {lesson.session_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink text-sm">{lesson.title}</p>
                    {lesson.objectives && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{lesson.objectives}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lesson.content ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Đã nhập
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Chưa có
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {lesson._count.versions > 0 ? `v${lesson._count.versions}` : '—'}
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
