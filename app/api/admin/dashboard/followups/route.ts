import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const notes = await prisma.leadNote.findMany({
    where: {
      next_followup_at: { lte: endOfToday },
      lead: { stage: 'consulting' },
    },
    distinct: ['lead_id'],
    orderBy: { next_followup_at: 'asc' },
    include: {
      lead: {
        include: {
          contact: { select: { name: true, phone: true } },
          assigned_to: { select: { full_name: true } },
        },
      },
    },
  })

  const result = notes.map((note) => {
    const followupDate = note.next_followup_at!
    const isOverdue = followupDate < startOfToday
    const overdueDays = isOverdue
      ? Math.ceil((startOfToday.getTime() - followupDate.getTime()) / 86400000)
      : 0

    return {
      leadId: note.lead.id,
      contactName: note.lead.contact.name,
      phone: note.lead.contact.phone,
      assignedTo: note.lead.assigned_to?.full_name ?? null,
      nextFollowupAt: followupDate.toISOString(),
      overdueDays,
    }
  })

  return NextResponse.json(result)
}
