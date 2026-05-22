'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center p-8 max-w-sm">
        <h2 className="text-xl font-bold text-foreground mb-2">Tải trang thất bại</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {error.message || 'Có lỗi khi tải dữ liệu. Vui lòng thử lại.'}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-[#E8471A] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}
