import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import LeadNoteTimeline from '@/components/custom/LeadNoteTimeline'
import LeadStageControl from '@/components/custom/LeadStageControl'

const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook', website: 'Website', hys: 'HYS',
  referral: 'Giới thiệu', event: 'Sự kiện', other: 'Khác',
}
const SOURCE_COLOR: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-700',
  website: 'bg-purple-100 text-purple-700',
  hys: 'bg-green-100 text-green-700',
  referral: 'bg-amber-100 text-amber-700',
  event: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
}
const STAGE_LABEL: Record<string, string> = {
  new: 'Mới', consulting: 'Đang tư vấn', won: 'Đã chốt', lost: 'Không chốt',
}
const STAGE_COLOR: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  consulting: 'bg-amber-100 text-amber-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
}
const LOST_REASON_LABEL: Record<string, string> = {
  no_money: 'Không có tiền', no_time: 'Không có thời gian',
  wrong_fit: 'Không phù hợp', competitor: 'Chọn đơn vị khác',
  dislike_teacher: 'Không thích giảng viên', not_ready: 'Chưa sẵn sàng',
  other: 'Lý do khác',
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [lead, user, users] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        contact: {
          select: {
            id: true, name: true, phone: true, source: true, status: true, email: true,
          },
        },
        assigned_to: { select: { id: true, full_name: true } },
        created_by: { select: { full_name: true } },
        // Middleware không lọc nested — tường minh deleted_at: null
        notes: {
          where: { deleted_at: null },
          include: { created_by: { select: { id: true, full_name: true } } },
          orderBy: { created_at: 'desc' },
        },
        enrollments: {
          where: { deleted_at: null },
          include: { class: { select: { id: true, name: true } } },
          orderBy: { created_at: 'desc' },
        },
      },
    }),
    getCurrentUser(),
    prisma.user.findMany({
      where: { is_active: true },
      select: { id: true, full_name: true },
      orderBy: { full_name: 'asc' },
    }),
  ])

  if (!lead) notFound()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/admin/leads" className="hover:text-flame transition-colors">Pipeline Leads</Link>
        <span>/</span>
        <span className="text-ink font-medium">{lead.contact.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái — Thông tin Lead */}
        <div className="lg:col-span-1 space-y-4">
          {/* Card thông tin */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Link
                  href={`/admin/contacts/${lead.contact.id}`}
                  className="text-xl font-bold text-ink hover:text-flame transition-colors"
                >
                  {lead.contact.name}
                </Link>
                <p className="text-sm text-gray-500 mt-0.5">{lead.contact.phone}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${SOURCE_COLOR[lead.contact.source] ?? 'bg-gray-100 text-gray-500'}`}>
                {SOURCE_LABEL[lead.contact.source] ?? lead.contact.source}
              </span>
            </div>

            {/* Stage badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500">Trạng thái:</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLOR[lead.stage]}`}>
                {STAGE_LABEL[lead.stage]}
              </span>
            </div>

            {/* Lost reason */}
            {lead.stage === 'lost' && lead.lost_reason && (
              <div className="bg-red-50 rounded-lg px-3 py-2 mb-3">
                <p className="text-xs text-red-600 font-medium">
                  Lý do: {LOST_REASON_LABEL[lead.lost_reason] ?? lead.lost_reason}
                </p>
                {lead.lost_note && (
                  <p className="text-xs text-red-500 mt-0.5">{lead.lost_note}</p>
                )}
              </div>
            )}

            {/* Assigned to */}
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="text-xs text-gray-500 w-24 flex-shrink-0">Tư vấn viên:</span>
              <span className="text-sm text-ink font-medium">
                {lead.assigned_to?.full_name ?? '—'}
              </span>
            </div>

            {/* Enrollment link */}
            {lead.enrollments.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">Enrollment:</span>
                <Link
                  href={`/classes/${lead.enrollments[0].class.id}`}
                  className="text-sm text-flame hover:underline"
                >
                  {lead.enrollments[0].class.name}
                </Link>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">
              Tạo bởi {lead.created_by?.full_name} · {new Date(lead.created_at).toLocaleDateString('vi-VN')}
            </p>
          </div>

          {/* Stage + Assign control */}
          <LeadStageControl
            leadId={lead.id}
            currentStage={lead.stage}
            currentAssignedToId={lead.assigned_to_id}
            users={users}
          />
        </div>

        {/* Cột phải — Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-4">
              Nhật ký tư vấn ({lead.notes.length})
            </h2>
            <LeadNoteTimeline
              leadId={lead.id}
              initialNotes={lead.notes.map((n) => ({
                id: n.id,
                content: n.content,
                contact_method: n.contact_method as string,
                contact_result: n.contact_result as string,
                next_followup_at: n.next_followup_at?.toISOString() ?? null,
                created_at: n.created_at.toISOString(),
                updated_at: n.updated_at.toISOString(),
                created_by: n.created_by,
              }))}
              currentUserId={user!.id}
              isAdmin={user!.role === 'ADMIN'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
