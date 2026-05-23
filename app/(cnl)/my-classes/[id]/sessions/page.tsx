export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import ClassDetailTabs from '@/components/custom/ClassDetailTabs'
import SessionZoomLinkInput from '@/components/custom/SessionZoomLinkInput'

export default async function ClassSessionsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return null

  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    include: {
      program: { select: { name: true } },
      // Middleware không xử lý nested include → thêm deleted_at: null tường minh
      sessions: {
        where: { deleted_at: null },
        include: {
          _count: { select: { attendances: true } },
          lesson: { select: { id: true, title: true } },
        },
        orderBy: { session_number: 'asc' },
      },
      enrollments: {
        where: { status: { in: ['active', 'waitlist', 'suspended'] }, deleted_at: null },
        select: { id: true },
      },
    },
  })

  if (!cls) notFound()

  // CNL chỉ được xem lớp mình phụ trách
  if (user.role === 'HOMEROOM' && cls.homeroom_id !== user.id) {
    redirect('/my-classes')
  }

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const totalStudents = cls.enrollments.length

  const todaySessions = cls.sessions.filter((s) => {
    const d = new Date(s.scheduled_at)
    return d >= todayStart && d <= todayEnd
  })

  const pastSessions = cls.sessions
    .filter((s) => new Date(s.scheduled_at) < todayStart)
    .reverse() // buổi gần nhất lên đầu

  const upcomingSessions = cls.sessions.filter((s) => new Date(s.scheduled_at) > todayEnd)

  const formatDateTime = (iso: Date) =>
    new Date(iso).toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/my-classes" className="hover:text-flame">
          Lớp học
        </Link>
        <span>/</span>
        <span className="text-ink truncate">{cls.name}</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#E8471A]">{cls.name}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{cls.program.name}</p>
      </div>

      {/* Tab navigation */}
      <ClassDetailTabs classId={params.id} />

      {/* Trạng thái rỗng */}
      {cls.sessions.length === 0 && (
        <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400 text-sm">Lớp chưa có buổi học nào</p>
          <p className="text-gray-300 text-xs mt-1">Admin sẽ tạo lịch học cho lớp này</p>
        </div>
      )}

      {/* Buổi HÔM NAY — nổi bật màu Flame */}
      {todaySessions.map((session) => (
        <div
          key={session.id}
          className="mb-5 bg-flame text-white rounded-xl px-4 py-5 shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  HÔM NAY
                </span>
                <span className="text-xs font-bold opacity-80 uppercase tracking-wide">
                  Buổi #{session.session_number}
                </span>
              </div>
              <p className="font-bold text-base leading-snug">
                {session.title ?? `Buổi ${session.session_number}`}
              </p>
              <p className="text-white/80 text-sm mt-1">
                {formatDateTime(session.scheduled_at)}
              </p>
              <p className="text-white/70 text-xs mt-1">
                {session._count.attendances}/{totalStudents} đã điểm danh
              </p>
              {session.session_zoom_link && (
                <a
                  href={session.session_zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white underline opacity-90 mt-1.5 inline-block"
                >
                  Mở link phòng học
                </a>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Link
                href={`/my-classes/${params.id}/sessions/${session.id}/attendance`}
                className="bg-white text-flame text-sm font-bold px-4 rounded-lg min-h-[44px] flex items-center whitespace-nowrap shadow-sm"
              >
                Điểm danh ngay
              </Link>
              <Link
                href={`/my-classes/${params.id}/sessions/${session.id}/lesson`}
                className="bg-white/20 text-white text-sm font-semibold px-4 rounded-lg min-h-[44px] flex items-center whitespace-nowrap text-center justify-center hover:bg-white/30 transition-colors"
              >
                Xem bài giảng
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Buổi đã qua */}
      {pastSessions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Đã qua ({pastSessions.length})
          </h2>
          <div className="space-y-3">
            {pastSessions.map((session) => {
              const allMarked =
                session._count.attendances >= totalStudents && totalStudents > 0
              return (
                <div
                  key={session.id}
                  className="bg-white rounded-xl px-4 py-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                          Buổi #{session.session_number}
                        </span>
                        {/* Pill trạng thái */}
                        {allMarked ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            {session._count.attendances}/{totalStudents}
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            {session._count.attendances}/{totalStudents} điểm
                          </span>
                        )}
                        {session.is_completed && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                            Đã dạy
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-ink">
                        {session.title ?? `Buổi ${session.session_number}`}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatDateTime(session.scheduled_at)}
                      </p>
                      {session.session_zoom_link && (
                        <a
                          href={session.session_zoom_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-flame underline mt-1 inline-block"
                        >
                          Link phòng học
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link
                        href={`/my-classes/${params.id}/sessions/${session.id}/attendance`}
                        className="bg-flame text-white text-sm font-semibold px-4 rounded-lg min-h-[44px] flex items-center hover:bg-flame/90 transition-colors whitespace-nowrap"
                      >
                        Điểm danh
                      </Link>
                      <Link
                        href={`/my-classes/${params.id}/sessions/${session.id}/lesson`}
                        className="border border-gray-200 text-gray-500 text-sm font-medium px-4 rounded-lg min-h-[44px] flex items-center hover:border-flame/40 hover:text-flame transition-colors whitespace-nowrap justify-center"
                      >
                        Bài giảng
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sắp diễn ra — cho phép nhập link Zoom inline */}
      {upcomingSessions.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Sắp diễn ra ({upcomingSessions.length})
          </h2>
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-xl px-4 py-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Buổi #{session.session_number}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    Sắp tới
                  </span>
                </div>
                <p className="font-semibold text-ink">
                  {session.title ?? `Buổi ${session.session_number}`}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(session.scheduled_at).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {/* Inline zoom link edit — auto-save khi blur */}
                <SessionZoomLinkInput
                  sessionId={session.id}
                  initialValue={session.session_zoom_link}
                />
                <Link
                  href={`/my-classes/${params.id}/sessions/${session.id}/lesson`}
                  className="mt-3 w-full border border-gray-200 text-gray-500 text-sm font-medium px-4 rounded-lg min-h-[44px] flex items-center hover:border-flame/40 hover:text-flame transition-colors justify-center"
                >
                  Xem bài giảng
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
