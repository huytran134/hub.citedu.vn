import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin()
  if (response) return response

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: {
      program: { select: { id: true, name: true, branch: true } },
      created_by: { select: { full_name: true } },
      _count: { select: { versions: true } },
    },
  })

  if (!lesson) return NextResponse.json({ error: 'Không tìm thấy bài giảng' }, { status: 404 })

  return NextResponse.json(lesson)
}

// Admin sửa Lesson → tạo LessonVersion mới, KHÔNG ghi đè trực tiếp
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
  const { title, objectives, content, materials_url, discussion_questions, notes_for_teacher, change_note } = body

  if (!title) {
    return NextResponse.json({ error: 'Tiêu đề bài giảng không được để trống' }, { status: 400 })
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: params.id } })
  if (!lesson) return NextResponse.json({ error: 'Không tìm thấy bài giảng' }, { status: 404 })

  // Đếm số version hiện có để tính version_number mới
  const versionCount = await prisma.lessonVersion.count({ where: { lesson_id: params.id } })

  // Transaction: cập nhật Lesson + tạo LessonVersion mới
  const [updatedLesson, newVersion] = await prisma.$transaction([
    prisma.lesson.update({
      where: { id: params.id },
      data: {
        title,
        objectives: objectives ?? null,
        content: content ?? null,
        materials_url: materials_url ?? null,
        discussion_questions: discussion_questions ?? null,
        notes_for_teacher: notes_for_teacher ?? null,
      },
    }),
    prisma.lessonVersion.create({
      data: {
        lesson_id: params.id,
        version_number: versionCount + 1,
        title,
        objectives: objectives ?? null,
        content: content ?? null,
        materials_url: materials_url ?? null,
        discussion_questions: discussion_questions ?? null,
        notes_for_teacher: notes_for_teacher ?? null,
        change_note: change_note ?? null,
        created_by_id: user.id,
      },
    }),
  ])

  return NextResponse.json({ lesson: updatedLesson, version: newVersion })
}
