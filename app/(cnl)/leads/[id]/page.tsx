import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import LeadNoteTimeline from '@/components/custom/LeadNoteTimeline'

const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook', website: 'Website', hys: 'HYS',
  referral: 'Giới thiệu', event: 'Sự kiện', other: 'Khác',
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

export default async function CnlLeadDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [lead, currentUser] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        contact: {
          select: { id: true, name: true, phone: true, source: true, status: true },
        },
        assigned_to: { select: { full_name: true } },
        // Middleware không lọc nested — tường minh deleted_at: null
        notes: {
          where: { deleted_at: null },
          include: { created_by: { select: { id: true, full_name: true } } },
          orderBy: { created_at: 'desc' },
        },
      },
    }),
    getCurrentUser(),
  ])

  if (!lead) notFound()

  return (
    <div className="pb-20">
      {/* Back button */}
      <div className="px-4 pt-4 pb-2">
        <Link href="/leads" className="text-sm text-flame hover:underline">
          ← Danh sách Leads
        </Link>
      </div>

      {/* Contact info */}
      <div className="mx-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-lg text-ink">{lead.contact.name}</p>
            <p className="text-sm text-gray-500">{lead.contact.phone}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STAGE_COLOR[lead.stage]}`}>
            {STAGE_LABEL[lead.stage]}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span>Nguồn: {SOURCE_LABEL[lead.contact.source] ?? lead.contact.source}</span>
          {lead.assigned_to && (
            <span>· Tư vấn viên: {lead.assigned_to.full_name}</span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="mx-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
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
          currentUserId={currentUser!.id}
          isAdmin={false}
        />
      </div>
    </div>
  )
}
