export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import WaitlistSection, {
  type WaitlistEnrollment,
  type AvailableClass,
} from './WaitlistSection'

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

const BRANCH_LABEL: Record<string, string> = {
  tu_duy: 'Tư duy',
  coaching: 'Coaching 1-1',
  ky_nang: 'Kỹ năng',
}

type Tab = 'classes' | 'waitlist'

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  await getCurrentUser()

  const tab: Tab = searchParams.tab === 'waitlist' ? 'waitlist' : 'classes'

  const [classes, waitlistRaw, availableClassesRaw, waitlistCount] = await Promise.all([
    tab === 'classes'
      ? prisma.class.findMany({
          include: {
            program: { select: { name: true, branch: true } },
            homeroom: { select: { full_name: true } },
            _count: { select: { enrollments: true } },
          },
          orderBy: { created_at: 'desc' },
        })
      : Promise.resolve([]),

    tab === 'waitlist'
      ? prisma.enrollment.findMany({
          where: { status: 'waitlist' },
          include: {
            contact: { select: { name: true, phone: true } },
            class: {
              include: { program: { select: { name: true, branch: true } } },
            },
          },
          orderBy: { created_at: 'asc' },
        })
      : Promise.resolve([]),

    tab === 'waitlist'
      ? prisma.class.findMany({
          where: { status: { in: ['forming', 'active'] }, deleted_at: null },
          include: {
            program: { select: { name: true, price: true } },
            _count: {
              select: {
                enrollments: {
                  where: { status: { in: ['active', 'suspended'] }, deleted_at: null },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
        })
      : Promise.resolve([]),

    // Luôn đếm waitlist để hiển thị badge trên tab
    prisma.enrollment.count({ where: { status: 'waitlist' } }),
  ])

  // Serialize BigInt trước khi pass xuống Client Component
  const waitlistEnrollments: WaitlistEnrollment[] = waitlistRaw.map((e) => ({
    id: e.id,
    contact: e.contact,
    class: {
      id: e.class.id,
      name: e.class.name,
      program: e.class.program,
    },
    agreed_price: Number(e.agreed_price),
    created_at: e.created_at.toISOString(),
  }))

  const availableClasses: AvailableClass[] = availableClassesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    enrolledCount: c._count.enrollments,
    max_students: c.max_students,
    program: {
      name: c.program.name,
      price: Number(c.program.price),
    },
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8471A] uppercase tracking-wide">Lớp học</h1>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'classes' ? `${classes.length} lớp` : `${waitlistCount} học viên chờ xếp lớp`}
          </p>
        </div>
        {tab === 'classes' && (
          <Link
            href="/classes/new"
            className="bg-flame text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-flame-light transition-colors"
          >
            + Tạo lớp mới
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <Link
          href="/classes"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            tab === 'classes'
              ? 'bg-navy text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Tất cả lớp
        </Link>
        <Link
          href="/classes?tab=waitlist"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
            tab === 'waitlist'
              ? 'bg-navy text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Waitlist
          {waitlistCount > 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === 'waitlist'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {waitlistCount}
            </span>
          )}
        </Link>
      </div>

      {/* Nội dung tab Lớp học */}
      {tab === 'classes' && (
        <>
          {classes.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-gray-400 mb-4">Chưa có lớp học nào</p>
              <Link href="/classes/new" className="text-flame font-medium hover:underline">
                Tạo lớp đầu tiên
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Lớp</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Chương trình</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Chủ nhiệm</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Học viên</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em]">Trạng thái</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#7fb8f5] cursor-pointer hover:text-[#b8d8ff]">{cls.name}</p>
                        {cls.start_date && (
                          <p className="text-[11px] text-[#6b7fa3] mt-0.5">
                            {new Date(cls.start_date).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[#c8d8f0]">{cls.program.name}</p>
                        <p className="text-[11px] text-[#6b7fa3]">{BRANCH_LABEL[cls.program.branch]}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c8d8f0]">
                        {cls.homeroom?.full_name || <span className="text-[#6b7fa3]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c8d8f0]">
                        {cls._count.enrollments} / {cls.max_students}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[cls.status]}`}>
                          {STATUS_LABEL[cls.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/classes/${cls.id}`}
                          className="text-sm text-flame font-medium hover:underline"
                        >
                          Xem
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Nội dung tab Waitlist */}
      {tab === 'waitlist' && (
        <WaitlistSection
          initialWaitlist={waitlistEnrollments}
          availableClasses={availableClasses}
        />
      )}
    </div>
  )
}
