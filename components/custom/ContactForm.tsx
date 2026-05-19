'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { normalizePhone } from '@/lib/utils'

const SOURCE_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'website', label: 'Website' },
  { value: 'hys', label: 'HYS (CLB Thanh niên KN)' },
  { value: 'referral', label: 'Giới thiệu' },
  { value: 'event', label: 'Sự kiện' },
  { value: 'other', label: 'Khác' },
]

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'alumni', label: 'Cựu học viên' },
  { value: 'dropped', label: 'Bỏ học' },
]

function isValidVNPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.startsWith('84') ? '0' + digits.slice(2) : digits
  return normalized.startsWith('0') && normalized.length === 10
}

type PhoneState =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'valid' }
  | { type: 'invalid' }
  | { type: 'duplicate'; contactId: string; contactName: string }

export interface ContactFormValues {
  name: string
  phone: string
  email: string
  zalo_id: string
  date_of_birth: string
  address: string
  gender: string
  source: string
  status?: string
  note?: string
}

interface Props {
  mode: 'create' | 'edit'
  contactId?: string
  defaultValues?: Partial<ContactFormValues>
  /** URL redirect sau khi thành công (edit mode) */
  successRedirect: string
  /** Base URL redirect sau khi tạo mới — sẽ append /${result.id} */
  createRedirectBase?: string
}

export default function ContactForm({ mode, contactId, defaultValues, successRedirect, createRedirectBase }: Props) {
  const router = useRouter()
  const [phoneState, setPhoneState] = useState<PhoneState>({ type: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const lastCheckedPhone = useRef('')

  const checkPhone = async (phone: string) => {
    if (!phone.trim()) { setPhoneState({ type: 'idle' }); return }
    if (!isValidVNPhone(phone)) { setPhoneState({ type: 'invalid' }); return }

    const normalized = normalizePhone(phone)
    if (normalized === lastCheckedPhone.current) return
    lastCheckedPhone.current = normalized

    setPhoneState({ type: 'checking' })
    try {
      const res = await fetch(`/api/contacts/check-phone?phone=${encodeURIComponent(normalized)}`)
      const data = await res.json()

      if (data.exists) {
        // Edit mode: nếu SĐT thuộc chính contact đang sửa → không phải duplicate
        if (mode === 'edit' && data.contact?.id === contactId) {
          setPhoneState({ type: 'valid' })
        } else {
          setPhoneState({ type: 'duplicate', contactId: data.contact.id, contactName: data.contact.name })
        }
      } else {
        setPhoneState({ type: 'valid' })
      }
    } catch {
      setPhoneState({ type: 'idle' })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (phoneState.type === 'duplicate' || phoneState.type === 'invalid') return

    setSubmitting(true)
    setError('')

    const form = e.currentTarget
    const formData = new FormData(form)
    const data: Record<string, string> = {}
    formData.forEach((value, key) => { if (typeof value === 'string') data[key] = value })

    const url = mode === 'create' ? '/api/contacts' : `/api/contacts/${contactId}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Có lỗi xảy ra, vui lòng thử lại')
        setSubmitting(false)
        return
      }

      const result = await res.json()
      router.push(mode === 'create' ? `${createRedirectBase ?? '/contacts'}/${result.id}` : successRedirect)
    } catch {
      setError('Không kết nối được máy chủ')
      setSubmitting(false)
    }
  }

  const isDuplicate = phoneState.type === 'duplicate'
  const isPhoneInvalid = phoneState.type === 'invalid'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Tên */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Họ và tên <span className="text-flame">*</span>
        </label>
        <input
          name="name"
          type="text"
          defaultValue={defaultValues?.name ?? ''}
          required
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          placeholder="Nguyễn Văn A"
        />
      </div>

      {/* SĐT + Smart Match */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Số điện thoại <span className="text-flame">*</span>
        </label>
        <input
          name="phone"
          type="tel"
          defaultValue={defaultValues?.phone ?? ''}
          required
          onBlur={(e) => checkPhone(e.target.value)}
          className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
            isDuplicate
              ? 'border-amber-400 focus:ring-amber-200 bg-amber-50'
              : isPhoneInvalid
              ? 'border-red-400 focus:ring-red-200'
              : phoneState.type === 'valid'
              ? 'border-green-400 focus:ring-green-200'
              : 'border-gray-200 focus:ring-flame/30 focus:border-flame'
          }`}
          placeholder="0912 345 678"
        />

        {/* Smart Match feedback */}
        {phoneState.type === 'checking' && (
          <p className="text-xs text-gray-400 mt-1.5">Đang kiểm tra...</p>
        )}
        {phoneState.type === 'valid' && (
          <p className="text-xs text-green-600 mt-1.5">✓ SĐT hợp lệ</p>
        )}
        {isPhoneInvalid && (
          <p className="text-xs text-red-600 mt-1.5">SĐT không đúng định dạng Việt Nam (10 số, bắt đầu 0)</p>
        )}
        {isDuplicate && (
          <div className="mt-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700 font-medium">
              ⚠️ SĐT này đã tồn tại — {phoneState.contactName}
            </p>
            <a
              href={`/admin/contacts/${phoneState.contactId}`}
              className="text-xs text-flame underline mt-0.5 inline-block"
            >
              Xem hồ sơ →
            </a>
          </div>
        )}
      </div>

      {/* Email + Zalo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ''}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            placeholder="email@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Zalo ID</label>
          <input
            name="zalo_id"
            type="text"
            defaultValue={defaultValues?.zalo_id ?? ''}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
            placeholder="ID hoặc SĐT Zalo"
          />
        </div>
      </div>

      {/* Ngày sinh + Giới tính */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Ngày sinh</label>
          <input
            name="date_of_birth"
            type="date"
            defaultValue={defaultValues?.date_of_birth ?? ''}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Giới tính</label>
          <select
            name="gender"
            defaultValue={defaultValues?.gender ?? ''}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          >
            <option value="">Không xác định</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>
      </div>

      {/* Nguồn */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Nguồn <span className="text-flame">*</span>
        </label>
        <select
          name="source"
          defaultValue={defaultValues?.source ?? ''}
          required
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
        >
          <option value="">Chọn nguồn...</option>
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Trạng thái (chỉ hiện khi edit) */}
      {mode === 'edit' && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Trạng thái</label>
          <select
            name="status"
            defaultValue={defaultValues?.status ?? 'lead'}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Địa chỉ */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Địa chỉ</label>
        <input
          name="address"
          type="text"
          defaultValue={defaultValues?.address ?? ''}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame"
          placeholder="Quận/Huyện, Tỉnh/Thành phố"
        />
      </div>

      {/* Ghi chú đầu tiên (chỉ khi tạo mới) */}
      {mode === 'create' && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Ghi chú đầu tiên</label>
          <textarea
            name="note"
            rows={3}
            defaultValue={defaultValues?.note ?? ''}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame/30 focus:border-flame resize-none"
            placeholder="DM fanpage hỏi về khóa Tư duy, quan tâm khóa cấp 1..."
          />
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || isDuplicate || isPhoneInvalid}
          className="bg-flame text-white font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-flame/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
        >
          {submitting ? 'Đang lưu...' : mode === 'create' ? 'Tạo Contact' : 'Lưu thay đổi'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-ink transition-colors min-h-[44px] px-4"
        >
          Huỷ
        </button>
      </div>
    </form>
  )
}
