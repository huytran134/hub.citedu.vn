import { NextRequest, NextResponse } from 'next/server'
import { requireHomeroom } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

async function getSessionAndCheck(sessionId: string, userId: string, role: string) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      class_id: true,
      scheduled_at: true,
      class: { select: { homeroom_id: true } },
    },
  })
  if (!session) return { session: null, error: 'Không tìm thấy buổi học.', status: 404 }
  if (role === 'HOMEROOM' && session.class.homeroom_id !== userId) {
    return { session: null, error: 'Không có quyền.', status: 403 }
  }
  return { session, error: null, status: 200 }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const { session, error, status } = await getSessionAndCheck(
    params.sessionId,
    user.id,
    user.role,
  )
  if (!session) return NextResponse.json({ error }, { status })

  const links = await prisma.magicLink.findMany({
    where: { session_id: params.sessionId, context: 'evaluation' },
    select: {
      id: true,
      token: true,
      used_at: true,
      expires_at: true,
      contact: { select: { name: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json({ links })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { user, response } = await requireHomeroom()
  if (response) return response

  const { session, error, status } = await getSessionAndCheck(
    params.sessionId,
    user.id,
    user.role,
  )
  if (!session) return NextResponse.json({ error }, { status })

  // expires_at = ngày buổi học + 7 ngày
  const expiresAt = new Date(session.scheduled_at)
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Lấy tất cả enrollment đang học
  const enrollments = await prisma.enrollment.findMany({
    where: {
      class_id: session.class_id,
      status: { in: ['active', 'waitlist', 'suspended'] },
    },
    select: { contact_id: true },
  })

  // Lấy link đã tồn tại
  const existing = await prisma.magicLink.findMany({
    where: { session_id: params.sessionId, context: 'evaluation' },
    select: { contact_id: true },
  })
  const existingSet = new Set(existing.map((l) => l.contact_id))

  const toCreate = enrollments.filter((e) => !existingSet.has(e.contact_id))

  if (toCreate.length > 0) {
    await prisma.magicLink.createMany({
      data: toCreate.map((e) => ({
        contact_id: e.contact_id,
        class_id: session.class_id,
        session_id: params.sessionId,
        context: 'evaluation' as const,
        expires_at: expiresAt,
        created_by_id: user.id,
      })),
    })
  }

  const links = await prisma.magicLink.findMany({
    where: { session_id: params.sessionId, context: 'evaluation' },
    select: {
      id: true,
      token: true,
      used_at: true,
      expires_at: true,
      contact: { select: { name: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json({ links, created: toCreate.length })
}
