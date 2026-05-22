export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import ContactNoteTimeline from '@/components/custom/ContactNoteTimeline'
import type { ContactNote } from '@/components/custom/ContactNoteTimeline'
import DeleteContactButton from '@/components/custom/DeleteContactButton'

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

export default async function AdminContactDetailPage({ params }: { params: { id: string } }) {
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
      referrer: { select: { id: true, name: true } },
      created_by: { select: { full_name: true } },
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

  const hasActiveEnrollment = enrollmentsWithDebt.some((e) => e.status === 'active')

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/admin/contacts" className="hover:text-flame">Contacts</Link>
        <span>/</span>
        <span className="text-ink truncate">{contact.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái — Thông tin */}
        <div className="lg:col-span-2 space-y-5">

          {/* Card thông tin chính */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xl font-bold">
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-ink">{contact.name}</h1>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[contact.status]}`}>
                    {STATUS_LABEL[contact.status]}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/admin/contacts/${contact.id}/edit`}
                  className="text-sm font-medium text-flame border border-flame/30 rounded-lg px-4 py-2 hover:bg-flame/5 transition-colors"
                >
                  Chỉnh sửa
                </Link>
                <DeleteContactButton
                  contactId={contact.id}
                  hasActiveEnrollment={hasActiveEnrollment}
                  redirectTo="/admin/contacts"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="SĐT" value={contact.phone} />
              <InfoRow label="Email" value={contact.email} />
              <InfoRow label="Zalo ID" value={contact.zalo_id} />
              <InfoRow
                label="Ngày sinh"
                value={contact.date_of_birth ? new Date(contact.date_of_birth).toLocaleDateString('vi-VN') : null}
              />
              <InfoRow
                label="Giới tính"
                value={contact.gender === 'male' ? 'Nam' : contact.gender === 'female' ? 'Nữ' : contact.gender === 'other' ? 'Khác' : null}
              />
              <InfoRow label="Địa chỉ" value={contact.address} />
              <InfoRow label="Nguồn" value={SOURCE_LABEL[contact.source]} />
              {contact.referrer && (
                <div>
                  <span className="text-xs text-gray-400 block mb-0.5">Người giới thiệu</span>
                  <Link
                    href={`/admin/contacts/${contact.referrer.id}`}
                    className="text-sm text-flame hover:underline font-medium"
                  >
                    {contact.referrer.name}
                  </Link>
                </div>
              )}
              <InfoRow
                label="Ngày tạo"
                value={`${new Date(contact.created_at).toLocaleDateString('vi-VN')} · bởi ${contact.created_by.full_name}`}
              />
            </div>
          </div>

          {/* Khóa học */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-ink dark:text-gray-100">Khóa học ({enrollmentsWithDebt.length})</h2>
            </div>
            {enrollmentsWithDebt.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Chưa đăng ký khóa nào</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {enrollmentsWithDebt.map((e) => (
                  <div key={e.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/classes/${e.class.id}`}
                        className="font-medium text-ink hover:text-flame transition-colors"
                      >
                        {e.class.name}
                      </Link>
                      <div className="mt-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ENROLLMENT_STATUS_COLOR[e.status]}`}>
                          {ENROLLMENT_STATUS_LABEL[e.status]}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-ink">{formatCurrency(e.agreedPrice)}</p>
                      <p className="text-xs text-green-600 mt-0.5">Đã đóng: {formatCurrency(e.paid)}</p>
                      {e.debt > 0 && (
                        <p className="text-xs font-bold text-amber-600">Còn nợ: {formatCurrency(e.debt)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Cột phải — Ghi chú */}
        <div>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-ink dark:text-gray-100 mb-4">Ghi chú</h2>
            <ContactNoteTimeline
              contactId={contact.id}
              initialNotes={serializedNotes}
              currentUserId={user.id}
              isAdmin
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <span className="text-xs text-gray-400 block mb-0.5">{label}</span>
      <span className="text-sm text-ink font-medium">{value}</span>
    </div>
  )
}
