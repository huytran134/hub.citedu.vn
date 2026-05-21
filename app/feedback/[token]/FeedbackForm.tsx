'use client'

import { useState } from 'react'

const CRITERIA = [
  { key: 'rating_teacher', label: 'Phần giảng của giảng viên' },
  { key: 'rating_assistant', label: 'Phần trợ giảng' },
  { key: 'rating_organization', label: 'Phần tổ chức lớp' },
] as const

type RatingKey = (typeof CRITERIA)[number]['key']

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl leading-none transition-transform active:scale-110 focus:outline-none"
          aria-label={`${star} sao`}
        >
          {star <= (hovered || value) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  )
}

export default function FeedbackForm({
  token,
  sessionLabel,
  className,
}: {
  token: string
  sessionLabel: string
  className: string
}) {
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    rating_teacher: 0,
    rating_assistant: 0,
    rating_organization: 0,
  })
  const [otherNotes, setOtherNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const allRated = CRITERIA.every((c) => ratings[c.key] > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allRated) return

    setStatus('loading')
    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating_teacher: ratings.rating_teacher,
          rating_assistant: ratings.rating_assistant,
          rating_organization: ratings.rating_organization,
          other_notes: otherNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Có lỗi xảy ra.')
        setStatus('error')
      } else {
        setStatus('success')
      }
    } catch {
      setErrorMsg('Không kết nối được máy chủ.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="text-xl font-bold text-ink mb-2">Cảm ơn bạn!</h2>
        <p className="text-gray-500 text-sm">
          Phản hồi của bạn đã được ghi nhận. Đội ngũ CiT EDU sẽ dùng góp ý này để cải thiện chất
          lượng lớp học.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Session info */}
      <div className="bg-navy text-white rounded-xl px-4 py-4">
        <p className="text-xs text-white/60 mb-0.5">{className}</p>
        <p className="font-bold text-base">{sessionLabel}</p>
      </div>

      {/* Rating criteria */}
      {CRITERIA.map((criterion) => (
        <div
          key={criterion.key}
          className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-4"
        >
          <p className="font-semibold text-ink text-sm mb-3">{criterion.label}</p>
          <StarRating
            value={ratings[criterion.key]}
            onChange={(v) => setRatings((prev) => ({ ...prev, [criterion.key]: v }))}
          />
          {ratings[criterion.key] > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {['', 'Rất tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Rất tốt'][ratings[criterion.key]]}
            </p>
          )}
        </div>
      ))}

      {/* Other notes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-4">
        <p className="font-semibold text-ink text-sm mb-2">
          Cảm nghĩ về bài học{' '}
          <span className="font-normal text-gray-400">(không bắt buộc)</span>
        </p>
        <textarea
          value={otherNotes}
          onChange={(e) => setOtherNotes(e.target.value)}
          placeholder="Chia sẻ thêm cảm nhận của bạn..."
          rows={3}
          maxLength={500}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-flame/50 resize-none"
        />
      </div>

      {/* Error */}
      {status === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{errorMsg}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!allRated || status === 'loading'}
        className="w-full bg-flame text-white font-bold rounded-xl min-h-[52px] text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-flame/90 transition-colors"
      >
        {status === 'loading' ? 'Đang gửi...' : 'Gửi đánh giá'}
      </button>

      {!allRated && (
        <p className="text-center text-xs text-gray-400">
          Vui lòng đánh giá đủ 3 phần trên để gửi.
        </p>
      )}
    </form>
  )
}
