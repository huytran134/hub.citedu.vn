import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import AttendanceBoard from '@/components/custom/AttendanceBoard'
import SessionZoomLinkInput from '@/components/custom/SessionZoomLinkInput'
import SessionNotesInput from '@/components/custom/SessionNotesInput'
import type { StudentAttendance } from '@/components/custom/AttendanceBoard'

export default async function AttendancePage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const user = await getCurrentUser()
  if (!user) return null

  // Fetch session + kiểm tra thuộc đúng lớp
  const session = await prisma.classSession.findUnique({
    where: { id: params.sessionId },
    include: {
      class: {
        select: { id: true, name: true, homeroom_id: true },
      },
    },
  })

  // notFound nếu session không tồn tại hoặc không thuộc lớp trong URL
  if (!session || session.class.id !== params.id) notFound()

  // CNL chỉ được điểm danh lớp mình
  if (user.role === 'HOMEROOM' && session.class.homeroom_id !== user.id) {
    redirect('/my-classes')
  }

  // Lấy enrollment đang học của lớp (active, waitlist, suspended)
  // Middleware tự thêm deleted_at: null cho top-level Enrollment query
  const enrollments = await prisma.enrollment.findMany({
    where: {
      class_id: params.id,
      status: { in: ['active', 'waitlist', 'suspended'] },
    },
    include: {
      contact: { select: { name: true, phone: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  // Lấy attendance đã có của buổi này (Attendance không có soft delete)
  const attendances = await prisma.attendance.findMany({
    where: { session_id: params.sessionId },
    select: { enrollment_id: true, status: true },
  })

  const attendanceMap = Object.fromEntries(attendances.map((a) => [a.enrollment_id, a.status]))

  const students: StudentAttendance[] = enrollments.map((e) => ({
    enrollment_id: e.id,
    contact_name: e.contact.name,
    contact_phone: e.contact.phone,
    status: (attendanceMap[e.id] as StudentAttendance['status']) ?? null,
  }))

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 flex-wrap">
        <Link href="/my-classes" className="hover:text-flame flex-shrink-0">
          Lớp học
        </Link>
        <span>/</span>
        <Link
          href={`/my-classes/${params.id}/sessions`}
          className="hover:text-flame truncate flex-shrink-0"
        >
          {session.class.name}
        </Link>
        <span>/</span>
        <span className="text-ink flex-shrink-0">Điểm danh</span>
      </div>

      {/* Header buổi học */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">
          Buổi #{session.session_number}
          {session.title ? ` — ${session.title}` : ''}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date(session.scheduled_at).toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {students.length} học viên · Bấm 1 nút = lưu ngay
        </p>
      </div>

      {/* Input link Zoom/Meet — CNL nhập trước buổi học */}
      <div className="mb-5 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-4">
        {session.session_zoom_link ? (
          <div>
            <p className="text-xs text-gray-400 mb-1">Link phòng học</p>
            <a
              href={session.session_zoom_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-flame font-medium underline break-all"
            >
              {session.session_zoom_link}
            </a>
          </div>
        ) : null}
        <SessionZoomLinkInput
          sessionId={params.sessionId}
          initialValue={session.session_zoom_link}
        />
      </div>

      {/* Bảng điểm danh — progress bar + danh sách học viên */}
      {students.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400 text-sm">Chưa có học viên trong lớp</p>
        </div>
      ) : (
        <AttendanceBoard sessionId={params.sessionId} initialStudents={students} />
      )}

      {/* Ghi chú buổi học — CNL nhập sau buổi, có thể cuộn xuống để tìm */}
      <div className="mt-4 mb-32">
        <SessionNotesInput sessionId={params.sessionId} initialValue={session.notes} />
      </div>
    </div>
  )
}
