export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import SessionDetailTabs from '@/components/custom/SessionDetailTabs'
import EvaluationLinks from './EvaluationLinks'

function StarDisplay({ value }: { value: number }) {
  return (
    <span>
      {'⭐'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  )
}

function AvgBar({ avg, label }: { avg: number; label: string }) {
  const pct = (avg / 5) * 100
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xs font-bold text-ink">{avg.toFixed(1)} / 5</p>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-flame rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default async function FeedbackResultsPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, homeroom_id: true },
  })
  if (!cls) notFound()

  if (user.role === 'HOMEROOM' && cls.homeroom_id !== user.id) {
    redirect('/my-classes')
  }

  const session = await prisma.classSession.findUnique({
    where: { id: params.sessionId },
    select: {
      id: true,
      class_id: true,
      session_number: true,
      title: true,
      feedbacks: {
        select: {
          rating_teacher: true,
          rating_assistant: true,
          rating_organization: true,
          other_notes: true,
        },
      },
    },
  })

  if (!session || session.class_id !== params.id) notFound()

  // Links cho link management component
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

  const feedbacks = session.feedbacks
  const count = feedbacks.length
  const sessionLabel = session.title
    ? `Buổi ${session.session_number} — ${session.title}`
    : `Buổi ${session.session_number}`

  const avg = (key: keyof (typeof feedbacks)[0]) =>
    count > 0
      ? feedbacks.reduce((s, f) => s + (f[key] as number), 0) / count
      : 0

  const avgTeacher = avg('rating_teacher')
  const avgAssistant = avg('rating_assistant')
  const avgOrg = avg('rating_organization')
  const avgOverall = count > 0 ? (avgTeacher + avgAssistant + avgOrg) / 3 : 0

  const comments = feedbacks.filter((f) => f.other_notes?.trim())

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hub.citedu.vn'

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground/70 mb-4 flex-wrap">
        <Link href="/my-classes" className="hover:text-flame flex-shrink-0">
          Lớp học
        </Link>
        <span>/</span>
        <Link
          href={`/my-classes/${params.id}/sessions`}
          className="hover:text-flame truncate flex-shrink-0"
        >
          {cls.name}
        </Link>
        <span>/</span>
        <span className="text-ink flex-shrink-0">Đánh giá</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#E8471A]">{sessionLabel}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{cls.name}</p>
      </div>

      {/* Tab nav */}
      <SessionDetailTabs classId={params.id} sessionId={params.sessionId} />

      {/* Tổng quan */}
      {count === 0 ? (
        <div className="bg-background rounded-xl p-10 text-center shadow-sm border border-border mb-4">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-muted-foreground text-sm">Chưa có đánh giá nào cho buổi học này.</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Tạo link rồi gửi cho học viên bên dưới.</p>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="bg-background rounded-xl shadow-sm border border-border p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <p className="text-3xl font-bold text-flame">{avgOverall.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground/70">điểm trung bình / {count} đánh giá</p>
              </div>
              <div className="text-right">
                <StarDisplay value={Math.round(avgOverall)} />
              </div>
            </div>
            <div className="space-y-3">
              <AvgBar avg={avgTeacher} label="Giảng viên" />
              <AvgBar avg={avgAssistant} label="Trợ giảng" />
              <AvgBar avg={avgOrg} label="Tổ chức lớp" />
            </div>
          </div>

          {/* Comments */}
          {comments.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3">
                Cảm nghĩ ({comments.length})
              </h2>
              <div className="space-y-2">
                {comments.map((f, i) => (
                  <div
                    key={i}
                    className="bg-background rounded-xl shadow-sm border border-border px-4 py-3"
                  >
                    <p className="text-sm text-foreground/90 leading-relaxed">{f.other_notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Link management */}
      <EvaluationLinks
        sessionId={params.sessionId}
        initialLinks={links.map((l) => ({
          ...l,
          used_at: l.used_at?.toISOString() ?? null,
          expires_at: l.expires_at.toISOString(),
        }))}
        appUrl={appUrl}
      />
    </div>
  )
}
