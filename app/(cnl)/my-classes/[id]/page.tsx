export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import ClassDetailTabs from '@/components/custom/ClassDetailTabs'

const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  waitlist: 'Chờ khai giảng',
  active: 'Đang học',
  suspended: 'Bảo lưu',
  completed: 'Hoàn thành',
  dropped: 'Thôi học',
}

const ENROLLMENT_STATUS_COLOR: Record<string, string> = {
  waitlist: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  dropped: 'bg-red-100 text-red-700',
}

export default async function CnlClassDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return null

  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    include: {
      program: { select: { name: true, branch: true } },
      homeroom: { select: { full_name: true } },
      enrollments: {
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          payments: {
            where: { status: 'approved', deleted_at: null },
            select: { amount: true },
          },
          refunds: {
            where: { status: 'approved', deleted_at: null },
            select: { amount: true },
          },
        },
        orderBy: { created_at: 'asc' },
      },
    },
  })

  if (!cls) notFound()

  // CNL chỉ được xem lớp mình phụ trách
  if (user.role === 'HOMEROOM' && cls.homeroom_id !== user.id) {
    redirect('/my-classes')
  }

  // Tính công nợ realtime + số tiền tối đa có thể hoàn
  const enrollmentsWithDebt = cls.enrollments.map((e) => {
    const paid = e.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalRefunded = e.refunds.reduce((sum, r) => sum + Number(r.amount), 0)
    const agreedPrice = Number(e.agreed_price)
    const maxRefundable = paid - totalRefunded
    return { ...e, agreedPrice, paid, debt: agreedPrice - paid, totalRefunded, maxRefundable }
  })

  const totalDebt = enrollmentsWithDebt.reduce((sum, e) => sum + e.debt, 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/my-classes" className="hover:text-flame">Lớp học</Link>
        <span>/</span>
        <span className="text-ink truncate">{cls.name}</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">{cls.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {cls.program.name}
          {cls.start_date && ` · Khai giảng: ${new Date(cls.start_date).toLocaleDateString('vi-VN')}`}
        </p>
      </div>

      {/* Tab navigation — Học viên | Buổi học */}
      <ClassDetailTabs classId={params.id} />

      {/* KPI tổng công nợ */}
      {totalDebt > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-amber-700">Tổng công nợ chưa thu</p>
          <p className="text-xl font-bold text-amber-700">{formatCurrency(totalDebt)}</p>
        </div>
      )}

      {/* Danh sách học viên */}
      <div className="space-y-3">
        {enrollmentsWithDebt.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
            Chưa có học viên nào
          </div>
        ) : (
          enrollmentsWithDebt.map((e) => (
            <div
              key={e.id}
              className="bg-white rounded-xl px-4 py-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-ink">{e.contact.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ENROLLMENT_STATUS_COLOR[e.status]}`}>
                      {ENROLLMENT_STATUS_LABEL[e.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{e.contact.phone}</p>
                </div>

                {/* Tài chính */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">Học phí TT</p>
                  <p className="font-semibold text-ink">{formatCurrency(e.agreedPrice)}</p>
                  <p className="text-xs text-green-600 mt-0.5">Đã đóng: {formatCurrency(e.paid)}</p>
                  {e.debt > 0 && (
                    <p className="text-xs font-bold text-amber-600">Còn nợ: {formatCurrency(e.debt)}</p>
                  )}
                </div>
              </div>

              {/* Nút tạo phiếu thu + lệnh hoàn — 44px */}
              {(e.status === 'active' || e.status === 'waitlist' || e.status === 'suspended') && (
                <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col gap-2">
                  {(e.status === 'active' || e.status === 'waitlist') && (
                    <Link
                      href={`/my-classes/${cls.id}/payments/new?enrollment_id=${e.id}&student_name=${encodeURIComponent(e.contact.name)}&debt=${e.debt}`}
                      className="flex items-center justify-center gap-2 bg-flame text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-flame-light transition-colors min-h-[44px]"
                    >
                      + Tạo phiếu thu
                      {e.debt > 0 && <span className="opacity-80">({formatCurrency(e.debt)})</span>}
                    </Link>
                  )}
                  {cls.program.branch !== 'coaching' && e.maxRefundable > 0 && (
                    <Link
                      href={`/my-classes/${cls.id}/refunds/new?enrollment_id=${e.id}&student_name=${encodeURIComponent(e.contact.name)}&agreed_price=${e.agreedPrice}&paid=${e.paid}&max_refundable=${e.maxRefundable}`}
                      className="flex items-center justify-center gap-2 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
                    >
                      Tạo lệnh hoàn tiền
                      <span className="text-gray-400 text-xs">(tối đa {formatCurrency(e.maxRefundable)})</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
