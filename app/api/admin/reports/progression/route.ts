import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const targetProgramId = searchParams.get('targetProgramId') || undefined

  // Danh sách program có prerequisites — dùng cho dropdown
  // Middleware soft-delete tự lọc Program.deleted_at = null
  const programsWithPrereqs = await prisma.program.findMany({
    where: {
      prerequisites: { some: {} },
    },
    select: {
      id: true,
      name: true,
      branch: true,
      level: true,
      prerequisites: {
        select: {
          prerequisite_id: true,
          logic_group: true,
          prerequisite: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ branch: 'asc' }, { level: 'asc' }],
  })

  // Không có targetProgramId → chỉ trả về danh sách programs
  if (!targetProgramId) {
    return NextResponse.json({
      programs: programsWithPrereqs,
      targetProgram: null,
      eligible: [],
      alreadyEnrolledCount: 0,
    })
  }

  const targetProgram = programsWithPrereqs.find((p) => p.id === targetProgramId)
  if (!targetProgram) {
    return NextResponse.json({ error: 'Program không tồn tại' }, { status: 404 })
  }

  const prerequisites = targetProgram.prerequisites

  // Không có điều kiện tiên quyết → không ai cần check
  if (prerequisites.length === 0) {
    return NextResponse.json({
      programs: programsWithPrereqs,
      targetProgram,
      eligible: [],
      alreadyEnrolledCount: 0,
    })
  }

  // Nhóm prerequisite theo logic_group
  // Cùng group = OR (đủ 1) · Khác group = AND (phải đủ tất cả groups)
  const groups = new Map<number, string[]>()
  for (const prereq of prerequisites) {
    if (!groups.has(prereq.logic_group)) groups.set(prereq.logic_group, [])
    groups.get(prereq.logic_group)!.push(prereq.prerequisite_id)
  }

  const allPrereqProgramIds = prerequisites.map((p) => p.prerequisite_id)

  // Contact đã có enrollment trong program mục tiêu (bất kỳ status)
  // Middleware soft-delete tự lọc Enrollment.deleted_at = null ở top-level
  const alreadyEnrolledInTarget = await prisma.enrollment.findMany({
    where: {
      deleted_at: null, // explicit vì đây là top-level query (middleware xử lý, nhưng rõ ràng hơn)
      class: { program_id: targetProgramId },
    },
    select: { contact_id: true },
  })
  const alreadyEnrolledSet = new Set(alreadyEnrolledInTarget.map((e) => e.contact_id))

  // Contact có ít nhất 1 enrollment completed trong nhóm prerequisite programs
  // Contact.deleted_at = null tự động bởi middleware
  const contacts = await prisma.contact.findMany({
    where: {
      enrollments: {
        some: {
          status: 'completed',
          deleted_at: null, // explicit cho nested — middleware không xử lý nested
          class: { program_id: { in: allPrereqProgramIds } },
        },
      },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      // Chỉ lấy completed enrollments trong prerequisite programs
      enrollments: {
        where: {
          status: 'completed',
          deleted_at: null,
          class: { program_id: { in: allPrereqProgramIds } },
        },
        select: {
          id: true,
          updated_at: true, // proxy cho ngày hoàn thành (không có completed_at riêng)
          class: {
            select: {
              program_id: true,
              program: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { updated_at: 'desc' },
      },
    },
  })

  // Kiểm tra từng contact có đủ điều kiện không (OR trong group, AND giữa groups)
  const eligible: {
    contact_id: string
    contact_name: string
    contact_phone: string
    completed_programs: { program_id: string; program_name: string; completed_at: string }[]
    latest_completion_at: string | null
  }[] = []

  let alreadyEnrolledEligibleCount = 0

  for (const contact of contacts) {
    // AND giữa các group — phải thỏa TẤT CẢ groups
    let meetsAll = true
    for (const [, groupProgramIds] of groups.entries()) {
      // OR trong group — có ít nhất 1 program trong group đã complete
      const hasCompletedInGroup = contact.enrollments.some((e) =>
        groupProgramIds.includes(e.class.program_id),
      )
      if (!hasCompletedInGroup) {
        meetsAll = false
        break
      }
    }
    if (!meetsAll) continue

    // Đã đủ điều kiện — check có đang enrolled target program chưa
    if (alreadyEnrolledSet.has(contact.id)) {
      alreadyEnrolledEligibleCount++
      continue
    }

    const completedPrograms = contact.enrollments.map((e) => ({
      program_id: e.class.program_id,
      program_name: e.class.program.name,
      completed_at: e.updated_at.toISOString(),
    }))

    // latest_completion_at: ngày hoàn thành gần nhất trong nhóm prereqs
    const latestAt = contact.enrollments[0]?.updated_at.toISOString() ?? null

    eligible.push({
      contact_id: contact.id,
      contact_name: contact.name,
      contact_phone: contact.phone,
      completed_programs: completedPrograms,
      latest_completion_at: latestAt,
    })
  }

  // Sắp xếp: hoàn thành gần nhất lên đầu (đang "nóng" nhất để upsell)
  eligible.sort((a, b) => {
    if (!a.latest_completion_at) return 1
    if (!b.latest_completion_at) return -1
    return new Date(b.latest_completion_at).getTime() - new Date(a.latest_completion_at).getTime()
  })

  return NextResponse.json({
    programs: programsWithPrereqs,
    targetProgram,
    eligible,
    alreadyEnrolledCount: alreadyEnrolledEligibleCount,
  })
}
