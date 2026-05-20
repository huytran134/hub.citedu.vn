'use client'

import { useEffect } from 'react'

export default function CnlError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('CNL error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Tải trang thất bại</h2>
        <p className="text-gray-500 text-sm mb-6">
          {error.message || 'Có lỗi khi tải dữ liệu. Vui lòng thử lại.'}
        </p>
        <button
          onClick={reset}
          className="w-full h-11 bg-[#E8471A] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}
