export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import LeadKanbanBoard, { type KanbanLead } from '@/components/custom/LeadKanbanBoard'
import LeadFilterBar from '@/components/custom/LeadFilterBar'
import type { LeadStage } from '@prisma/client'

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: { stage?: string; search?: string; assigned_to_id?: string; source?: string }
}) {
  const search = searchParams.search ?? ''
  const assignedToId = searchParams.assigned_to_id ?? ''
  const source = searchParams.source ?? ''

  const stageFilter = searchParams.stage
    ? { stage: { in: searchParams.stage.split(',') as LeadStage[] } }
    : {}

  const where: Record<string, unknown> = {
    ...stageFilter,
    ...(assignedToId && { assigned_to_id: assignedToId }),
  }

  if (search) {
    where.contact = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ],
    }
  } else if (source) {
    where.contact = { source }
  }

  const [leads, users] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, phone: true, source: true } },
        assigned_to: { select: { id: true, full_name: true } },
        // Middleware không lọc nested — tường minh deleted_at: null
        notes: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            next_followup_at: true,
            contact_result: true,
            created_at: true,
          },
        },
        enrollments: {
          where: { deleted_at: null },
          select: { id: true, status: true },
          take: 1,
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.user.findMany({
      where: { is_active: true },
      select: { id: true, full_name: true },
      orderBy: { full_name: 'asc' },
    }),
  ])

  return (
    <div>
      <LeadFilterBar
        defaultSearch={search}
        defaultAssignedTo={assignedToId}
        defaultSource={source}
        users={users}
      />
      <LeadKanbanBoard
        initialLeads={leads.map((l) => ({
          ...l,
          created_at: l.created_at.toISOString(),
          notes: l.notes.map((n) => ({
            ...n,
            created_at: n.created_at.toISOString(),
            next_followup_at: n.next_followup_at?.toISOString() ?? null,
          })),
        }))}
        users={users}
      />
    </div>
  )
}
