export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ContactSearchBar from '@/components/custom/ContactSearchBar'
import type { ContactSource, ContactStatus } from '@prisma/client'

const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook', website: 'Website', hys: 'HYS',
  referral: 'Giới thiệu', event: 'Sự kiện', other: 'Khác',
}
const SOURCE_COLOR: Record<string, string> = {
  facebook: 'bg-[#0a1a3d] text-[#7fb8f5] border border-[#1a2a5a]',
  website: 'bg-[#1a0a3d] text-[#b8a8f5] border border-[#2a1a5a]',
  hys: 'bg-[#0a2d1a] text-[#3ecf8e] border border-[#145a30]',
  referral: 'bg-[#3d2a0a] text-[#f5a623] border border-[#5a3d10]',
  event: 'bg-[#2d0a2a] text-[#e86cb8] border border-[#5a154a]',
  other: 'bg-[#1a1a2b] text-[#8899aa] border border-[#2a2a4a]',
}
const STATUS_LABEL: Record<string, string> = {
  lead: 'Lead', customer: 'Khách hàng', alumni: 'Cựu học viên', dropped: 'Bỏ học',
}
const STATUS_COLOR: Record<string, string> = {
  lead: 'bg-[#3d2a0a] text-[#f5a623] border border-[#5a3d10]',
  customer: 'bg-[#0a2d1a] text-[#3ecf8e] border border-[#145a30]',
  alumni: 'bg-[#1a1a2b] text-[#7fb8f5] border border-[#2a2a4a]',
  dropped: 'bg-[#2d0a0a] text-[#e86c6c] border border-[#5a1515]',
}

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: { search?: string; source?: string; status?: string; page?: string }
}) {
  const search = searchParams.search ?? ''
  const source = (searchParams.source ?? '') as ContactSource | ''
  const status = (searchParams.status ?? '') as ContactStatus | ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const limit = 20

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    }),
    ...(source && { source }),
    ...(status && { status }),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        source: true,
        status: true,
        created_at: true,
        _count: {
          select: {
            enrollments: { where: { status: { in: ['active', 'completed'] }, deleted_at: null } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Contacts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total.toLocaleString('vi-VN')} người trong hệ thống</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/contacts/import"
            className="border border-gray-200 dark:border-gray-600 text-ink dark:text-gray-200 font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[44px] flex items-center"
          >
            ↑ Import Sheets
          </Link>
          <Link
            href="/admin/contacts/new"
            className="bg-flame text-white font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-flame/90 transition-colors min-h-[44px] flex items-center"
          >
            + Thêm Contact
          </Link>
        </div>
      </div>

      {/* Search + Filter */}
      <ContactSearchBar defaultSearch={search} defaultSource={source} defaultStatus={status} />

      {/* Bảng */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {contacts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">
              {search || source || status ? 'Không tìm thấy contact nào phù hợp' : 'Chưa có contact nào'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em] px-5 py-3">Tên</th>
                    <th className="text-left text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em] px-5 py-3">SĐT</th>
                    <th className="text-left text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em] px-5 py-3">Nguồn</th>
                    <th className="text-left text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em] px-5 py-3">Trạng thái</th>
                    <th className="text-left text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em] px-5 py-3">Khóa học</th>
                    <th className="text-left text-[11px] font-semibold text-[#6b7fa3] uppercase tracking-[.05em] px-5 py-3">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/contacts/${c.id}`}
                          className="font-semibold text-[#7fb8f5] hover:text-[#b8d8ff] hover:underline underline-offset-2 transition-colors"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#c8d8f0]">{c.phone}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLOR[c.source]}`}>
                          {SOURCE_LABEL[c.source]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status]}`}>
                          {STATUS_LABEL[c.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#c8d8f0]">
                        {c._count.enrollments > 0 ? (
                          <span className="font-semibold text-[#7fb8f5]">{c._count.enrollments} khóa</span>
                        ) : (
                          <span className="text-[#6b7fa3]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-[#6b7fa3]">
                        {new Date(c.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-700">
              {contacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/contacts/${c.id}`}
                  className="block px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#7fb8f5]">{c.name}</p>
                      <p className="text-sm text-[#6b7fa3] mt-0.5">{c.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-gray-500">Trang {page} / {totalPages} · {total} contacts</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...(search && { search }), ...(source && { source }), ...(status && { status }), page: String(page - 1) }).toString()}`}
                className="text-sm text-flame hover:underline px-3 py-1.5 border border-flame/30 rounded-lg"
              >
                ← Trước
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...(search && { search }), ...(source && { source }), ...(status && { status }), page: String(page + 1) }).toString()}`}
                className="text-sm text-flame hover:underline px-3 py-1.5 border border-flame/30 rounded-lg"
              >
                Tiếp →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
