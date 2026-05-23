export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import LessonEditor from './LessonEditor'

export default async function LessonEditorPage({
  params,
}: {
  params: { programId: string; lessonId: string }
}) {
  await getCurrentUser()

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    include: {
      program: { select: { id: true, name: true, branch: true } },
      created_by: { select: { full_name: true } },
      _count: { select: { versions: true } },
    },
  })

  if (!lesson || lesson.program_id !== params.programId) notFound()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 flex-wrap">
        <Link href="/classes/lessons" className="hover:text-flame">Bài giảng</Link>
        <span>/</span>
        <Link href={`/classes/lessons/${params.programId}`} className="hover:text-flame">
          {lesson.program.name}
        </Link>
        <span>/</span>
        <span className="text-ink">Buổi {lesson.session_number} — {lesson.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-navy text-white text-sm font-bold">
              {lesson.session_number}
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#E8471A]">{lesson.title}</h1>
              <p className="text-sm text-gray-400">{lesson.program.name}</p>
            </div>
          </div>
        </div>
        {lesson._count.versions > 0 && (
          <div className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            Version {lesson._count.versions}
          </div>
        )}
      </div>

      <LessonEditor lesson={lesson} />
    </div>
  )
}
