import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const BRANCH_LABEL: Record<string, string> = {
  tu_duy: 'Tư duy (phát triển tư duy thành đạt và khởi nghiệp)',
  coaching: 'Coaching 1-1 (Mật Thất)',
  ky_nang: 'Kỹ năng bổ trợ',
}

// AI gợi ý nội dung bài giảng — chỉ trả về text để Admin xem xét, KHÔNG tự ghi vào DB
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin()
  if (response) return response

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Chưa cấu hình ANTHROPIC_API_KEY' }, { status: 503 })
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: { program: { select: { name: true, branch: true, sessions_count: true } } },
  })

  if (!lesson) return NextResponse.json({ error: 'Không tìm thấy bài giảng' }, { status: 404 })

  const body = await req.json()
  const currentTitle = body.title || lesson.title
  const currentObjectives = body.objectives || lesson.objectives || ''

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Bạn là chuyên gia thiết kế chương trình đào tạo cho CiT EDU — một trung tâm đào tạo về Tư duy Thành đạt & Khởi nghiệp tại Hà Nội, Việt Nam.

THÔNG TIN BÀI GIẢNG CẦN GỢI Ý:
- Chương trình: ${lesson.program.name}
- Nhánh: ${BRANCH_LABEL[lesson.program.branch] || lesson.program.branch}
- Tổng số buổi: ${lesson.program.sessions_count || 'Chưa xác định'}
- Buổi số: ${lesson.session_number}
- Tiêu đề buổi: ${currentTitle}
- Mục tiêu buổi: ${currentObjectives || '(Chưa có)'}

Hãy gợi ý nội dung cho buổi học này theo đúng định dạng JSON sau (KHÔNG viết gì ngoài JSON):
{
  "content": "Nội dung bài giảng chi tiết (Markdown, 300-500 từ, bao gồm: giới thiệu, nội dung chính theo từng mục, tóm tắt)",
  "discussion_questions": "3-5 câu hỏi thảo luận nhóm phù hợp với buổi học (Markdown danh sách)",
  "notes_for_teacher": "Lưu ý quan trọng cho giảng viên: điểm cần nhấn mạnh, cách xử lý câu hỏi khó, gợi ý hoạt động thực hành (100-200 từ)"
}

Viết bằng tiếng Việt. Nội dung phải thực tế, ứng dụng được ngay, phù hợp với học viên người Việt Nam đang học tư duy & khởi nghiệp.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON từ response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI trả về định dạng không hợp lệ' }, { status: 502 })
    }

    const suggestion = JSON.parse(jsonMatch[0]) as {
      content?: string
      discussion_questions?: string
      notes_for_teacher?: string
    }

    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error('AI suggest error:', err)
    return NextResponse.json({ error: 'Không thể kết nối AI, thử lại sau' }, { status: 502 })
  }
}
