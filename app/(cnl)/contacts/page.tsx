import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ContactSearchBar from '@/components/custom/ContactSearchBar'
import type { ContactSource, ContactStatus } from '@prisma/client'

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

export default async function CnlContactsPage({
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
      <h1 className="text-xl font-bold text-ink mb-1">Danh sách Contact</h1>
      <p className="text-gray-500 text-sm mb-5">
        {total.toLocaleString('vi-VN')} người trong hệ thống · Chỉ đọc
      </p>

      <ContactSearchBar defaultSearch={search} defaultSource={source} defaultStatus={status} />

      <div className="space-y-3">
        {contacts.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">
              {search || source || status ? 'Không tìm thấy contact nào phù hợp' : 'Chưa có contact nào'}
            </p>
          </div>
        ) : (
          contacts.map((c) => (
            <Link
              key={c.id}
              href={`/contacts/${c.id}`}
              className="flex items-center justify-between bg-white rounded-xl px-4 py-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-semibold text-ink">{c.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{c.phone}</p>
                <span className="text-xs text-gray-400">{SOURCE_LABEL[c.source]}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[c.status]}`}>
                {STATUS_LABEL[c.status]}
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-gray-500">Trang {page} / {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...(search && { search }), ...(source && { source }), ...(status && { status }), page: String(page - 1) }).toString()}`}
                className="text-sm text-flame border border-flame/30 rounded-lg px-4 py-2 min-h-[44px] flex items-center"
              >
                ← Trước
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...(search && { search }), ...(source && { source }), ...(status && { status }), page: String(page + 1) }).toString()}`}
                className="text-sm text-flame border border-flame/30 rounded-lg px-4 py-2 min-h-[44px] flex items-center"
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
