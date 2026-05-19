export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ClassDetailTabs from '@/components/custom/ClassDetailTabs'
import AdminSessionsClient from '@/components/custom/AdminSessionsClient'

export default async function AdminClassSessionsPage({ params }: { params: { id: string } }) {
  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    include: {
      program: { select: { name: true, branch: true } },
      homeroom: { select: { full_name: true } },
      sessions: {
        where: { deleted_at: null },
        include: {
          _count: { select: { attendances: true } },
        },
        orderBy: { session_number: 'asc' },
      },
    },
  })

  if (!cls) notFound()

  // Serialize BigInt và Date để truyền xuống Client Component
  const sessions = cls.sessions.map((s) => ({
    id: s.id,
    session_number: s.session_number,
    title: s.title,
    scheduled_at: s.scheduled_at.toISOString(),
    duration_min: s.duration_min,
    material_url: s.material_url,
    session_zoom_link: s.session_zoom_link,
    notes: s.notes,
    is_completed: s.is_completed,
    attendance_count: s._count.attendances,
  }))

  const isCoaching = cls.program.branch === 'coaching'

  // Dùng raw query để bypass middleware (middleware thêm deleted_at: null vào aggregate)
  // Cần max kể cả sessions đã xóa để tránh vi phạm unique constraint [class_id, session_number]
  const rawMax = await prisma.$queryRaw<{ max_num: bigint | null }[]>`
    SELECT MAX(session_number) as max_num FROM class_sessions WHERE class_id = ${params.id}
  `
  const nextSessionNumber = Number(rawMax[0]?.max_num ?? 0) + 1

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/classes" className="hover:text-flame">Lớp học</Link>
        <span>/</span>
        <span className="text-ink">{cls.name}</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">{cls.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {cls.program.name}
          {cls.homeroom && ` · CNL: ${cls.homeroom.full_name}`}
        </p>
      </div>

      {/* Tab navigation */}
      <ClassDetailTabs classId={params.id} basePath="/classes" />

      {/* Nội dung quản lý lịch học */}
      {isCoaching ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-700 font-medium">Lớp Coaching 1-1 không sử dụng tính năng lịch buổi học</p>
          <p className="text-amber-600 text-sm mt-1">Coaching 1-1 được lên lịch riêng giữa thầy và học viên</p>
        </div>
      ) : (
        <AdminSessionsClient
          classId={params.id}
          sessions={sessions}
          nextSessionNumber={nextSessionNumber}
        />
      )}
    </div>
  )
}
