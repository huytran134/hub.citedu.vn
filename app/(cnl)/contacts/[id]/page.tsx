export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import ContactNoteTimeline from '@/components/custom/ContactNoteTimeline'
import type { ContactNote } from '@/components/custom/ContactNoteTimeline'

const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook', website: 'Website', hys: 'HYS',
  referral: 'Giới thiệu', event: 'Sự kiện', other: 'Khác',
}
const STATUS_LABEL: Record<string, string> = {
  lead: 'Lead', customer: 'Khách hàng', alumni: 'Cựu học viên', dropped: 'Bỏ học',
}
const STATUS_COLOR: Record<string, string> = {
  lead: 'bg-amber-100 text-amber-700', customer: 'bg-green-100 text-green-700',
  alumni: 'bg-blue-100 text-blue-700', dropped: 'bg-red-100 text-red-700',
}
const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  waitlist: 'Chờ khai giảng', active: 'Đang học', suspended: 'Bảo lưu',
  completed: 'Hoàn thành', dropped: 'Thôi học',
}
const ENROLLMENT_STATUS_COLOR: Record<string, string> = {
  waitlist: 'bg-amber-100 text-amber-700', active: 'bg-green-100 text-green-700',
  suspended: 'bg-blue-100 text-blue-700', completed: 'bg-gray-100 text-gray-600',
  dropped: 'bg-red-100 text-red-700',
}

export default async function CnlContactDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return null

  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      notes: {
        where: { deleted_at: null },
        include: { created_by: { select: { id: true, full_name: true } } },
        orderBy: { created_at: 'desc' },
      },
      enrollments: {
        where: { deleted_at: null },
        include: {
          class: { select: { id: true, name: true } },
          payments: { where: { status: 'approved', deleted_at: null }, select: { amount: true } },
        },
        orderBy: { created_at: 'desc' },
      },
    },
  })

  if (!contact) notFound()

  const enrollmentsWithDebt = contact.enrollments.map((e) => {
    const paid = e.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    return { ...e, agreedPrice: Number(e.agreed_price), paid, debt: Number(e.agreed_price) - paid }
  })

  const serializedNotes: ContactNote[] = contact.notes.map((n) => ({
    id: n.id,
    content: n.content,
    created_at: n.created_at.toISOString(),
    updated_at: n.updated_at.toISOString(),
    created_by: n.created_by,
  }))

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/contacts" className="hover:text-flame">Contacts</Link>
        <span>/</span>
        <span className="text-ink truncate">{contact.name}</span>
      </div>

      {/* Header contact */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg font-bold">{contact.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink">{contact.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[contact.status]}`}>
              {STATUS_LABEL[contact.status]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {contact.phone && (
            <div>
              <span className="text-xs text-gray-400 block">SĐT</span>
              <a href={`tel:${contact.phone}`} className="text-sm font-medium text-flame">
                {contact.phone}
              </a>
            </div>
          )}
          {contact.email && (
            <div>
              <span className="text-xs text-gray-400 block">Email</span>
              <span className="text-sm font-medium text-ink">{contact.email}</span>
            </div>
          )}
          {contact.zalo_id && (
            <div>
              <span className="text-xs text-gray-400 block">Zalo</span>
              <span className="text-sm font-medium text-ink">{contact.zalo_id}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-gray-400 block">Nguồn</span>
            <span className="text-sm font-medium text-ink">{SOURCE_LABEL[contact.source]}</span>
          </div>
        </div>
      </div>

      {/* Khóa học */}
      {enrollmentsWithDebt.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-ink text-sm">Khóa học ({enrollmentsWithDebt.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {enrollmentsWithDebt.map((e) => (
              <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{e.class.name}</p>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${ENROLLMENT_STATUS_COLOR[e.status]}`}>
                    {ENROLLMENT_STATUS_LABEL[e.status]}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-ink">{formatCurrency(e.agreedPrice)}</p>
                  {e.debt > 0 && (
                    <p className="text-xs font-bold text-amber-600">Nợ: {formatCurrency(e.debt)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ghi chú */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-ink mb-4">Ghi chú</h2>
        <ContactNoteTimeline
          contactId={contact.id}
          initialNotes={serializedNotes}
          currentUserId={user.id}
          isAdmin={user.role === 'ADMIN'}
        />
      </div>
    </div>
  )
}
