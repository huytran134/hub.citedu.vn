import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// Rollback: load nội dung của version cũ → tạo version mới (không ghi đè)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; versionId: string } },
) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const version = await prisma.lessonVersion.findUnique({
    where: { id: params.versionId },
  })

  if (!version || version.lesson_id !== params.id) {
    return NextResponse.json({ error: 'Không tìm thấy version' }, { status: 404 })
  }

  const versionCount = await prisma.lessonVersion.count({ where: { lesson_id: params.id } })

  const [updatedLesson, newVersion] = await prisma.$transaction([
    prisma.lesson.update({
      where: { id: params.id },
      data: {
        title: version.title,
        objectives: version.objectives,
        content: version.content,
        materials_url: version.materials_url,
        discussion_questions: version.discussion_questions,
        notes_for_teacher: version.notes_for_teacher,
      },
    }),
    prisma.lessonVersion.create({
      data: {
        lesson_id: params.id,
        version_number: versionCount + 1,
        title: version.title,
        objectives: version.objectives,
        content: version.content,
        materials_url: version.materials_url,
        discussion_questions: version.discussion_questions,
        notes_for_teacher: version.notes_for_teacher,
        change_note: `Khôi phục từ Version ${version.version_number}`,
        created_by_id: user.id,
      },
    }),
  ])

  return NextResponse.json({ lesson: updatedLesson, version: newVersion })
}
