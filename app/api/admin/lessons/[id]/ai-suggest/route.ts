import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODEL = 'gemini-2.0-flash'

const BRANCH_LABEL: Record<string, string> = {
  tu_duy: 'Tư duy (phát triển tư duy thành đạt và khởi nghiệp)',
  coaching: 'Coaching 1-1 (Mật Thất)',
  ky_nang: 'Kỹ năng bổ trợ',
}

// AI gợi ý nội dung bài giảng — chỉ trả về text để Admin xem xét, KHÔNG tự ghi vào DB
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin()
  if (response) return response

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 503 })
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: { program: { select: { name: true, branch: true, sessions_count: true } } },
  })

  if (!lesson) return NextResponse.json({ error: 'Không tìm thấy bài giảng' }, { status: 404 })

  const body = await req.json()
  const currentTitle = body.title || lesson.title
  const currentObjectives = body.objectives || lesson.objectives || ''

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
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

    const result = await model.generateContent(prompt)

    // Safety filter: nội dung bị chặn
    const blockReason = result.response.promptFeedback?.blockReason
    if (blockReason) {
      console.warn('[Gemini] Bị safety filter:', blockReason)
      return NextResponse.json({ error: 'AI không thể gợi ý nội dung này (bị lọc an toàn), hãy thay tiêu đề và thử lại' }, { status: 422 })
    }

    const rawText = result.response.text()

    // Parse JSON từ response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[Gemini] Response không có JSON:', rawText.slice(0, 200))
      return NextResponse.json({ error: 'AI trả về định dạng không hợp lệ' }, { status: 502 })
    }

    let suggestion: { content?: string; discussion_questions?: string; notes_for_teacher?: string }
    try {
      suggestion = JSON.parse(jsonMatch[0])
    } catch {
      console.warn('[Gemini] JSON.parse thất bại:', jsonMatch[0].slice(0, 200))
      return NextResponse.json({ error: 'AI trả về dữ liệu không đọc được, vui lòng thử lại' }, { status: 502 })
    }

    return NextResponse.json({ suggestion })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Log cả status code nếu SDK trả về (GoogleGenerativeAIFetchError)
    const statusCode = (err as Record<string, unknown>)?.statusCode ?? (err as Record<string, unknown>)?.status
    console.error('[Gemini] ai-suggest error:', message, statusCode ? `(status ${statusCode})` : '')

    const msgLower = message.toLowerCase()
    const isQuotaError = msgLower.includes('quota') || msgLower.includes('resource_exhausted') || statusCode === 429 || String(statusCode) === '429'
    const isKeyError = msgLower.includes('api_key_invalid') || msgLower.includes('permission_denied') || statusCode === 401 || statusCode === 403 || String(statusCode) === '401' || String(statusCode) === '403'
    const isNetworkError = msgLower.includes('fetch failed') || msgLower.includes('error fetching') || msgLower.includes('econnrefused') || msgLower.includes('enotfound') || msgLower.includes('etimedout') || msgLower.includes('network error')
    const isSafetyError = msgLower.includes('safety') || msgLower.includes('blocked') || msgLower.includes('harm')

    if (isKeyError) {
      return NextResponse.json({ error: 'Cấu hình AI có vấn đề, liên hệ Admin' }, { status: 503 })
    }
    if (isQuotaError) {
      return NextResponse.json({ error: 'Hệ thống AI đang bận, vui lòng thử lại sau 1 phút' }, { status: 429 })
    }
    if (isNetworkError) {
      return NextResponse.json({ error: 'Server không kết nối được Gemini API — kiểm tra firewall VPS' }, { status: 503 })
    }
    if (isSafetyError) {
      return NextResponse.json({ error: 'AI không thể gợi ý nội dung này (bị lọc an toàn), hãy thay tiêu đề và thử lại' }, { status: 422 })
    }
    return NextResponse.json({ error: `Lỗi AI: ${message.slice(0, 120)}` }, { status: 502 })
  }
}
