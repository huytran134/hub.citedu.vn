'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  contactId: string
  hasActiveEnrollment: boolean
  redirectTo?: string
}

export default function DeleteContactButton({ contactId, hasActiveEnrollment, redirectTo }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (hasActiveEnrollment) {
      alert('Không thể xóa — Contact này có Enrollment đang active.\nVui lòng cho học viên thôi học trước.')
      return
    }

    if (!confirm('Xóa contact này?\nDữ liệu sẽ được ẩn đi nhưng vẫn có thể khôi phục khi cần.')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Có lỗi xảy ra')
        return
      }
      router.push(redirectTo ?? '/admin/contacts')
    } catch {
      alert('Không kết nối được máy chủ')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm font-medium text-red-600 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors disabled:opacity-40"
    >
      {deleting ? 'Đang xóa...' : 'Xóa'}
    </button>
  )
}
