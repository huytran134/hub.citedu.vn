export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import FeedbackForm from './FeedbackForm'

export default async function FeedbackPage({
  params,
}: {
  params: { token: string }
}) {
  const link = await prisma.magicLink.findUnique({
    where: { token: params.token },
    include: {
      session: {
        select: {
          session_number: true,
          title: true,
          scheduled_at: true,
          class: { select: { name: true } },
        },
      },
    },
  })

  // Token không tồn tại hoặc không phải evaluation link
  if (!link || link.context !== 'evaluation' || !link.session) {
    return <InvalidLink message="Link không tồn tại hoặc không hợp lệ." />
  }

  // Đã dùng rồi
  if (link.used_at) {
    return <InvalidLink message="Link này đã được sử dụng. Mỗi link chỉ dùng được một lần." />
  }

  // Hết hạn
  if (link.expires_at < new Date()) {
    return <InvalidLink message="Link đã hết hạn. Vui lòng liên hệ giảng viên để được hỗ trợ." />
  }

  const { session } = link
  const sessionLabel =
    session.title
      ? `Buổi ${session.session_number} — ${session.title}`
      : `Buổi ${session.session_number}`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Brand header */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">CiT EDU</p>
          <h1 className="text-xl font-bold text-ink mt-1">Đánh giá buổi học</h1>
          <p className="text-xs text-gray-400 mt-1">Phản hồi ẩn danh — chỉ mất 1 phút</p>
        </div>

        <FeedbackForm
          token={params.token}
          sessionLabel={sessionLabel}
          className={session.class.name}
        />
      </div>
    </div>
  )
}

function InvalidLink({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-lg font-bold text-ink mb-2">Link không khả dụng</h1>
        <p className="text-sm text-gray-500">{message}</p>
        <p className="text-xs text-gray-300 mt-4">CiT EDU — hub.citedu.vn</p>
      </div>
    </div>
  )
}
