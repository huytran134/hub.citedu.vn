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
  forming: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function MyClassesPage() {
  const user = await getCurrentUser()
  if (!user) return null

  // CNL chỉ thấy lớp mình. ADMIN thấy tất cả.
  const classes = await prisma.class.findMany({
    where: user.role === 'HOMEROOM' ? { homeroom_id: user.id } : {},
    include: {
      program: { select: { name: true, branch: true } },
      _count: { select: { enrollments: { where: { status: 'active' } } } },
    },
    orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
  })

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-1">Lớp của tôi</h1>
      <p className="text-gray-500 text-sm mb-5">{classes.length} lớp được phân công</p>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Chưa có lớp nào được phân công</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/my-classes/${cls.id}`}
              className="block bg-white rounded-xl px-4 py-4 shadow-sm border border-gray-100 hover:border-flame/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{cls.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{cls.program.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-gray-500 font-medium">
                    {cls._count.enrollments} học viên
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[cls.status]}`}>
                    {STATUS_LABEL[cls.status]}
                  </span>
                </div>
              </div>
              {cls.start_date && (
                <p className="text-xs text-gray-400 mt-2">
                  Khai giảng: {new Date(cls.start_date).toLocaleDateString('vi-VN')}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
