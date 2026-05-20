'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('CiT Hub error:', error)
  }, [error])

  return (
    <html lang="vi">
      <body className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-sm">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Có lỗi xảy ra</h1>
          <p className="text-gray-500 text-sm mb-6">
            Hệ thống gặp sự cố. Vui lòng thử lại hoặc liên hệ quản trị viên.
          </p>
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-[#E8471A] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  )
}
