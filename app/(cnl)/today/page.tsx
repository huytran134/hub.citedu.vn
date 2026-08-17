export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export default async function TodayPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  // CNL chỉ thấy lớp mình phụ trách — ADMIN thấy tất cả
  const classWhere = user.role === 'HOMEROOM' ? { homeroom_id: user.id } : {}

  // Tìm tất cả buổi học hôm nay của lớp CNL phụ trách
  const todaySessions = await prisma.classSession.findMany({
    where: {
      deleted_at: null,
      scheduled_at: { gte: todayStart, lte: todayEnd },
      class: { ...classWhere, deleted_at: null },
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          enrollments: {
            where: { status: { in: ['active', 'waitlist'] }, deleted_at: null },
            select: { id: true },
          },
        },
      },
      _count: { select: { attendances: true } },
    },
    orderBy: { scheduled_at: 'asc' },
  })

  // Lớp đang hoạt động của CNL — để hiển thị khi không có buổi hôm nay
  const activeClasses = await prisma.class.findMany({
    where: { ...classWhere, status: 'active', deleted_at: null },
    select: {
      id: true,
      name: true,
      _count: { select: { enrollments: { where: { status: 'active', deleted_at: null } } } },
    },
    orderBy: { created_at: 'desc' },
    take: 5,
  })

  const todayLabel = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })

  return (
    <div>
      <h1 className="text-xl font-bold text-[#E8471A] mb-0.5">Hôm nay</h1>
      <p className="text-gray-400 text-sm mb-5">{todayLabel}</p>

      {/* Buổi học hôm nay */}
      {todaySessions.length > 0 ? (
        <div className="space-y-4 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Buổi học hôm nay ({todaySessions.length})
          </h2>
          {todaySessions.map((session) => {
            const totalStudents = session.class.enrollments.length
            const attendedCount = session._count.attendances
            const allMarked = attendedCount >= totalStudents && totalStudents > 0
            const sessionTime = new Date(session.scheduled_at).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div
                key={session.id}
                className="bg-flame text-white rounded-2xl px-4 py-5 shadow-lg"
              >
                {/* Tên lớp + giờ */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-1">
                      Buổi #{session.session_number}
                    </p>
                    <p className="font-bold text-lg leading-snug">
                      {session.title ?? `Buổi ${session.session_number}`}
                    </p>
                    <p className="text-white/80 text-sm mt-0.5">{session.class.name}</p>
                    <p className="text-white/70 text-xs mt-1">🕐 {sessionTime}</p>
                  </div>
                  {/* Tiến độ điểm danh */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold leading-none">
                      {attendedCount}<span className="text-base opacity-70">/{totalStudents}</span>
                    </p>
                    <p className="text-xs opacity-70 mt-0.5">điểm danh</p>
                  </div>
                </div>

                {/* Progress bar */}
                {totalStudents > 0 && (
                  <div className="w-full bg-white/20 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-white rounded-full h-1.5 transition-all"
                      style={{ width: `${Math.min(100, (attendedCount / totalStudents) * 100)}%` }}
                    />
                  </div>
                )}

                {/* Link Zoom nếu có */}
                {session.session_zoom_link && (
                  <a
                    href={session.session_zoom_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white underline opacity-80 block mb-3"
                  >
                    📹 Mở link phòng học
                  </a>
                )}

                {/* Nút Điểm danh — 44px min-height */}
                <Link
                  href={`/my-classes/${session.class.id}/sessions/${session.id}/attendance`}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl font-bold text-sm min-h-[48px] transition-colors ${
                    allMarked
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white text-flame shadow-sm'
                  }`}
                >
                  {allMarked ? '✓ Đã điểm danh xong' : '📋 Điểm danh ngay'}
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        /* Không có buổi học hôm nay */
        <div className="bg-white rounded-2xl px-4 py-8 text-center shadow-sm border border-gray-100 mb-6">
          <p className="text-3xl mb-2">☀️</p>
          <p className="font-semibold text-ink">Hôm nay không có buổi học</p>
          <p className="text-sm text-gray-400 mt-1">Không có lớp nào lên lịch ngày hôm nay</p>
        </div>
      )}

      {/* Lớp đang hoạt động — truy cập nhanh */}
      {activeClasses.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Lớp đang học ({activeClasses.length})
          </h2>
          <div className="space-y-2">
            {activeClasses.map((cls) => (
              <Link
                key={cls.id}
                href={`/my-classes/${cls.id}`}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 hover:border-flame/30 transition-colors min-h-[52px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate text-sm">{cls.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-xs text-gray-400">
                    {cls._count.enrollments} học viên
                  </span>
                  <span className="text-gray-300 text-sm">›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
