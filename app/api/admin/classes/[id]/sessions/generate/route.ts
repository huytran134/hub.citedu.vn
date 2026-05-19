import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// Tính danh sách ngày học theo lịch lặp (không lưu DB — chỉ preview)
function generateScheduleDates(
  startDateStr: string,  // "YYYY-MM-DD"
  weekdays: number[],    // [1,4] = Thứ 2 & Thứ 5 (JS: 0=CN, 1=T2...6=T7)
  startTime: string,     // "08:00"
  totalSessions: number
): Array<{ session_number: number; scheduled_at: string }> {
  const [year, month, day] = startDateStr.split('-').map(Number)
  const [hours, minutes] = startTime.split(':').map(Number)

  const result: Array<{ session_number: number; scheduled_at: string }> = []
  const current = new Date(year, month - 1, day)

  let sessionNum = 1
  while (result.length < totalSessions) {
    if (weekdays.includes(current.getDay())) {
      const scheduledAt = new Date(current)
      scheduledAt.setHours(hours, minutes, 0, 0)
      result.push({
        session_number: sessionNum++,
        scheduled_at: scheduledAt.toISOString(),
      })
    }
    current.setDate(current.getDate() + 1)
  }

  return result
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await request.json()
  const { startDate, weekdays, startTime, totalSessions } = body

  if (!startDate || !weekdays?.length || !startTime || !totalSessions) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }
  if (totalSessions < 1 || totalSessions > 100) {
    return NextResponse.json({ error: 'Số buổi phải từ 1 đến 100' }, { status: 400 })
  }

  // Kiểm tra lớp tồn tại và không phải Nhánh 2 (Coaching)
  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    include: { program: { select: { branch: true, name: true } } },
  })

  if (!cls) {
    return NextResponse.json({ error: 'Không tìm thấy lớp học' }, { status: 404 })
  }
  if (cls.program.branch === 'coaching') {
    return NextResponse.json(
      { error: 'Lớp Coaching 1-1 không sử dụng tính năng lịch buổi học' },
      { status: 400 }
    )
  }

  const sessions = generateScheduleDates(startDate, weekdays, startTime, totalSessions)
  return NextResponse.json({ sessions })
}
