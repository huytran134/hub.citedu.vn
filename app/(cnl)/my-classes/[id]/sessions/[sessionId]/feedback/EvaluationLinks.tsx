'use client'

import { useState } from 'react'

type LinkRow = {
  id: string
  token: string
  used_at: string | null
  expires_at: string
  contact: { name: string }
}

export default function EvaluationLinks({
  sessionId,
  initialLinks,
  appUrl,
}: {
  sessionId: string
  initialLinks: LinkRow[]
  appUrl: string
}) {
  const [links, setLinks] = useState<LinkRow[]>(initialLinks)
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function handleCreate() {
    setIsCreating(true)
    setMessage('')
    try {
      const res = await fetch(`/api/cnl/sessions/${sessionId}/evaluation-link`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setLinks(data.links)
        if (data.created > 0) {
          setMessage(`Đã tạo ${data.created} link mới.`)
        } else {
          setMessage('Tất cả học viên đã có link.')
        }
      }
    } finally {
      setIsCreating(false)
    }
  }

  async function copyLink(token: string) {
    const url = `${appUrl}/feedback/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const submittedCount = links.filter((l) => l.used_at).length
  const isExpired = (l: LinkRow) => new Date(l.expires_at) < new Date()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-ink text-sm">
          Quản lý link đánh giá
        </h3>
        {links.length > 0 && (
          <span className="text-xs text-gray-400">
            {submittedCount}/{links.length} đã điền
          </span>
        )}
      </div>

      {message && (
        <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{message}</p>
      )}

      {links.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400 mb-4">Chưa có link đánh giá nào được tạo.</p>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-flame text-white text-sm font-bold px-6 rounded-xl min-h-[44px] disabled:opacity-50 hover:bg-flame/90 transition-colors"
          >
            {isCreating ? 'Đang tạo...' : 'Tạo link cho tất cả học viên'}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {links.map((link) => {
              const expired = isExpired(link)
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{link.contact.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      /feedback/{link.token.slice(0, 12)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {link.used_at ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Đã điền
                      </span>
                    ) : expired ? (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                        Hết hạn
                      </span>
                    ) : (
                      <button
                        onClick={() => copyLink(link.token)}
                        className="text-xs bg-navy text-white px-3 py-1.5 rounded-lg font-medium hover:bg-navy/80 transition-colors min-h-[32px]"
                      >
                        {copied === link.token ? 'Đã copy!' : 'Copy link'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full border border-gray-200 text-gray-500 text-sm font-medium rounded-xl min-h-[44px] hover:border-flame/40 hover:text-flame transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Đang tạo...' : 'Tạo link cho học viên chưa có'}
          </button>
        </>
      )}
    </div>
  )
}
