import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import AdminNav from '@/components/custom/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') redirect('/today')

  // Badge đỏ — đếm phiếu chờ duyệt để hiển thị trên nav
  // Badge đổi màu cam nếu phiếu chờ > 24h (CLAUDE.md 5.10)
  const [pendingPayments, pendingRefunds, oldestPendingPayment, oldestPendingRefund] =
    await Promise.all([
      prisma.payment.count({ where: { status: 'pending' } }),
      prisma.refund.count({ where: { status: 'pending' } }),
      prisma.payment.findFirst({
        where: { status: 'pending' },
        orderBy: { created_at: 'asc' },
        select: { created_at: true },
      }),
      prisma.refund.findFirst({
        where: { status: 'pending' },
        orderBy: { created_at: 'asc' },
        select: { created_at: true },
      }),
    ])

  // Tìm ngày tạo phiếu pending cũ nhất (Payment hoặc Refund)
  const dates = [
    oldestPendingPayment?.created_at,
    oldestPendingRefund?.created_at,
  ].filter(Boolean) as Date[]
  // Truyền timestamp (number) chứ không phải Date — Date không serialize qua RSC boundary
  const oldestPendingAt =
    dates.length > 0 ? Math.min(...dates.map((d) => d.getTime())) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav
        user={user}
        pendingPayments={pendingPayments}
        pendingRefunds={pendingRefunds}
        oldestPendingAt={oldestPendingAt}
      />
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
