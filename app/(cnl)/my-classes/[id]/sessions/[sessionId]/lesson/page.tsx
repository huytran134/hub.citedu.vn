export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export default async function LessonViewPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, homeroom_id: true, program: { select: { name: true } } },
  })

  if (!cls) notFound()

  // CNL chỉ được xem bài giảng lớp mình phụ trách — ranh giới bảo mật dữ liệu
  if (user.role === 'HOMEROOM' && cls.homeroom_id !== user.id) {
    redirect('/my-classes')
  }

  const session = await prisma.classSession.findUnique({
    where: { id: params.sessionId },
    include: {
      lesson: true,
    },
  })

  if (!session || session.class_id !== params.id) notFound()

  const lesson = session.lesson
  const sessionLabel = session.title ?? `Buổi ${session.session_number}`
  const backHref = `/my-classes/${params.id}/sessions`

  // Trường hợp buổi chưa có bài giảng gắn vào, hoặc bài giảng chưa có nội dung
  if (!lesson) {
    return (
      <LessonEmptyShell
        sessionNumber={session.session_number}
        sessionLabel={sessionLabel}
        backHref={backHref}
        className={cls.name}
        message="Buổi học này chưa được gắn bài giảng."
      />
    )
  }

  const hasContent = lesson.content || lesson.objectives || lesson.discussion_questions

  if (!hasContent) {
    return (
      <LessonEmptyShell
        sessionNumber={session.session_number}
        sessionLabel={sessionLabel}
        backHref={backHref}
        className={cls.name}
        message="Bài giảng chưa được cập nhật nội dung."
      />
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={backHref}
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:border-flame/40 hover:text-flame transition-colors shadow-sm"
          aria-label="Quay lại"
        >
          ←
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 truncate">{cls.name}</p>
          <h1 className="font-bold text-ink text-base leading-snug">
            Buổi {session.session_number} — {lesson.title}
          </h1>
        </div>
      </div>

      {/* Nội dung bài giảng */}
      <div className="space-y-4">

        {/* Mục tiêu */}
        {lesson.objectives && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎯</span>
              <h2 className="font-semibold text-ink text-sm uppercase tracking-wide">Mục tiêu buổi học</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{lesson.objectives}</p>
          </section>
        )}

        {/* Nội dung */}
        {lesson.content && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📋</span>
              <h2 className="font-semibold text-ink text-sm uppercase tracking-wide">Nội dung bài giảng</h2>
            </div>
            <PlainTextContent text={lesson.content} />
          </section>
        )}

        {/* Câu hỏi thảo luận */}
        {lesson.discussion_questions && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">❓</span>
              <h2 className="font-semibold text-ink text-sm uppercase tracking-wide">Câu hỏi thảo luận</h2>
            </div>
            <PlainTextContent text={lesson.discussion_questions} />
          </section>
        )}

        {/* Ghi chú giảng viên — CHỈ ADMIN thấy, CNL KHÔNG thấy */}
        {user.role === 'ADMIN' && lesson.notes_for_teacher && (
          <section className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📝</span>
              <h2 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
                Ghi chú giảng viên
              </h2>
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                Admin only
              </span>
            </div>
            <PlainTextContent text={lesson.notes_for_teacher} className="text-amber-900" />
          </section>
        )}

        {/* Nút mở tài liệu */}
        {lesson.materials_url && (
          <a
            href={lesson.materials_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-navy text-white text-sm font-semibold rounded-xl min-h-[48px] hover:bg-navy/90 transition-colors shadow-sm"
          >
            <span>📎</span>
            Mở tài liệu đính kèm
          </a>
        )}

        {/* Nút quay lại — 44px, cuối trang */}
        <Link
          href={backHref}
          className="flex items-center justify-center w-full border border-gray-200 text-gray-500 text-sm font-medium rounded-xl min-h-[44px] hover:border-gray-300 transition-colors"
        >
          ← Quay lại lịch học
        </Link>
      </div>
    </div>
  )
}

// Hiển thị plain text từ Markdown — không render Markdown, chỉ chia dòng
function PlainTextContent({ text, className = '' }: { text: string; className?: string }) {
  // Bỏ các ký tự Markdown cơ bản để đọc dễ hơn
  const cleaned = text
    .replace(/#{1,6}\s/g, '')       // ## heading
    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold**
    .replace(/\*(.*?)\*/g, '$1')     // *italic*
    .replace(/`(.*?)`/g, '$1')       // `code`
    .replace(/^\s*[-*+]\s/gm, '• ')  // bullet list
    .replace(/^\s*\d+\.\s/gm, (m) => m.trimStart()) // numbered list

  return (
    <div className={`text-sm text-gray-700 leading-relaxed space-y-1.5 ${className}`}>
      {cleaned.split('\n').filter((line) => line.trim()).map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  )
}

function LessonEmptyShell({
  sessionNumber,
  sessionLabel,
  backHref,
  className,
  message,
}: {
  sessionNumber: number
  sessionLabel: string
  backHref: string
  className: string
  message: string
}) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={backHref}
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:border-flame/40 hover:text-flame transition-colors shadow-sm"
          aria-label="Quay lại"
        >
          ←
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 truncate">{className}</p>
          <h1 className="font-bold text-ink text-base">Buổi {sessionNumber} — {sessionLabel}</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
        <p className="text-3xl mb-3">📄</p>
        <p className="text-gray-500 text-sm">{message}</p>
        <p className="text-gray-300 text-xs mt-1">Admin sẽ cập nhật bài giảng cho buổi này.</p>
      </div>

      <Link
        href={backHref}
        className="mt-4 flex items-center justify-center w-full border border-gray-200 text-gray-500 text-sm font-medium rounded-xl min-h-[44px] hover:border-gray-300 transition-colors"
      >
        ← Quay lại lịch học
      </Link>
    </div>
  )
}
