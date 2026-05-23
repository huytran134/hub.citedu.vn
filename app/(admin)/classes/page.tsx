export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

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

export default async function ClassesPage() {
  await getCurrentUser() // layout đã bảo vệ, chỉ cần user hiện tại

  const classes = await prisma.class.findMany({
    include: {
      program: { select: { name: true, branch: true } },
      homeroom: { select: { full_name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Lớp học</h1>
          <p className="text-muted-foreground text-sm mt-1">{classes.length} lớp học</p>
        </div>
        <Link
          href="/classes/new"
          className="bg-flame text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-flame-light transition-colors"
        >
          + Tạo lớp mới
        </Link>
      </div>

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
    </div>
  )
}
