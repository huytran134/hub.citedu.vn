export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import AddStudentForm from './AddStudentForm'
import ClassDetailTabs from '@/components/custom/ClassDetailTabs'
import EnrollmentActions from '@/components/custom/EnrollmentActions'

const STATUS_LABEL: Record<string, string> = {
  forming: 'Đang tuyển sinh',
  active: 'Đang học',
  completed: 'Đã kết thúc',
  cancelled: 'Đã hủy',
}

const STATUS_COLOR: Record<string, string> = {
  forming: 'bg-[#3d2a0a] text-[#f5a623] border border-[#5a3d10]',
  active: 'bg-[#0a2d1a] text-[#3ecf8e] border border-[#145a30]',
  completed: 'bg-[#1a1a2b] text-[#7fb8f5] border border-[#2a2a4a]',
  cancelled: 'bg-[#2d0a0a] text-[#e86c6c] border border-[#5a1515]',
}

const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  waitlist: 'Chờ khai giảng',
  active: 'Đang học',
  suspended: 'Bảo lưu',
  completed: 'Hoàn thành',
  dropped: 'Thôi học',
}

const ENROLLMENT_STATUS_COLOR: Record<string, string> = {
  waitlist: 'bg-[#3d2a0a] text-[#f5a623] border border-[#5a3d10]',
  active: 'bg-[#0a2d1a] text-[#3ecf8e] border border-[#145a30]',
  suspended: 'bg-[#0a1a3d] text-[#7fb8f5] border border-[#1a2a5a]',
  completed: 'bg-[#1a1a2b] text-[#8899aa] border border-[#2a2a4a]',
  dropped: 'bg-[#2d0a0a] text-[#e86c6c] border border-[#5a1515]',
}

export default async function ClassDetailPage({ params }: { params: { id: string } }) {
  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    include: {
      program: { select: { name: true, branch: true, price: true } },
      homeroom: { select: { full_name: true, email: true } },
      enrollments: {
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          payments: {
            where: { status: 'approved', deleted_at: null },
            select: { amount: true },
          },
        },
        orderBy: { created_at: 'asc' },
      },
      _count: { select: { sessions: true } },
    },
  })

  if (!cls) notFound()

  // Tính công nợ realtime — KHÔNG lưu DB
  const enrollmentsWithDebt = cls.enrollments.map((e) => {
    const paid = e.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const agreedPrice = Number(e.agreed_price)
    return { ...e, agreedPrice, paid, debt: agreedPrice - paid }
  })

  const totalDebt = enrollmentsWithDebt.reduce((sum, e) => sum + e.debt, 0)
  const totalPaid = enrollmentsWithDebt.reduce((sum, e) => sum + e.paid, 0)
  const activeCount = enrollmentsWithDebt.filter((e) => e.status === 'active').length

  const sessionsCompleted = await prisma.classSession.count({
    where: { class_id: params.id, is_completed: true },
  })

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#6b7fa3] mb-4">
        <Link href="/classes" className="hover:text-flame transition-colors">Lớp học</Link>
        <span>/</span>
        <span className="text-[#c8d8f0]">{cls.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">{cls.name}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[cls.status]}`}>
              {STATUS_LABEL[cls.status]}
            </span>
          </div>
          <p className="text-[#c8d8f0] text-sm mt-1">
            {cls.program.name}
            {cls.homeroom && ` · CNL: ${cls.homeroom.full_name}`}
            {cls.start_date && ` · Khai giảng: ${new Date(cls.start_date).toLocaleDateString('vi-VN')}`}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0d1c33] border border-[#1e3060] rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#6b7fa3]">Học viên đang học</p>
          <p className="text-xl font-bold mt-1 text-[#e8edf5]">{activeCount}</p>
        </div>
        <div className="bg-[#0d2218] border border-[#145a30] rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#6b7fa3]">Tổng đã thu</p>
          <p className="text-xl font-bold mt-1 text-[#5dd89c]">{formatCurrency(totalPaid)}</p>
        </div>
        <div
          className="rounded-xl p-4 shadow-sm border"
          style={{
            background: totalDebt > 0 ? '#2b1a0d' : '#0d2b1a',
            borderColor: totalDebt > 0 ? '#5a3515' : '#174d2a',
          }}
        >
          <p className="text-xs text-[#6b7fa3]">Tổng công nợ</p>
          <p className="text-xl font-bold mt-1" style={{ color: totalDebt > 0 ? '#f5a623' : '#3ecf8e' }}>
            {formatCurrency(totalDebt)}
          </p>
        </div>
        <div className="bg-[#0f2341] border border-[#1a3060] rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#6b7fa3]">Buổi đã học</p>
          <p className="text-xl font-bold mt-1 text-[#7fb8f5]">{sessionsCompleted} / {cls._count.sessions}</p>
        </div>
      </div>

      {/* Tab navigation — Học viên / Lịch học */}
      <ClassDetailTabs classId={params.id} basePath="/classes" />

      {/* Danh sách học viên */}
      <div className="bg-[#0d1c33] border border-[#1e3060] rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-[#1e3060] flex items-center justify-between">
          <h2 className="font-semibold text-[#c8d8f0]">
            Danh sách học viên ({enrollmentsWithDebt.length}/{cls.max_students})
          </h2>
        </div>

        {enrollmentsWithDebt.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            Chưa có học viên nào trong lớp
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#0a1628] border-b border-[#1e3060]">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Học viên</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Học phí TT</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Đã đóng</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Còn nợ</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Trạng thái</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3060]">
              {enrollmentsWithDebt.map((e) => (
                <tr key={e.id} className="hover:bg-[#0a1628] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#7fb8f5] text-sm">{e.contact.name}</p>
                    <p className="text-[11px] text-[#6b7fa3]">{e.contact.phone}</p>
                    {e.joined_late && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Vào lớp muộn (từ buổi {(e.joined_at_session ?? 0) + 1})
                      </p>
                    )}
                    {e.status === 'suspended' && e.suspended_until && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Bảo lưu đến {new Date(e.suspended_until).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                    {e.status === 'dropped' && e.dropped_at && (
                      <p className="text-xs text-red-500 mt-0.5">
                        Thôi học {new Date(e.dropped_at).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-[#c8d8f0]">
                    {formatCurrency(e.agreedPrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                    {formatCurrency(e.paid)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">
                    <span className={e.debt > 0 ? 'text-[#f5a623]' : 'text-[#6b7fa3]'}>
                      {formatCurrency(e.debt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ENROLLMENT_STATUS_COLOR[e.status]}`}>
                      {ENROLLMENT_STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <EnrollmentActions
                      enrollmentId={e.id}
                      contactName={e.contact.name}
                      status={e.status as 'waitlist' | 'active' | 'suspended' | 'completed' | 'dropped'}
                      suspendedUntil={e.suspended_until ? e.suspended_until.toISOString() : null}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form thêm học viên */}
      {cls.status !== 'completed' && cls.status !== 'cancelled' && (
        <AddStudentForm
          classId={params.id}
          programPrice={Number(cls.program.price)}
          sessionsCompleted={sessionsCompleted}
          classStatus={cls.status}
        />
      )}
    </div>
  )
}
