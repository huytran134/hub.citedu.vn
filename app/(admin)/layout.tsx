import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import AdminNav from '@/components/custom/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') redirect('/today')

  // Badge đỏ — đếm phiếu chờ duyệt để hiển thị trên nav
  const [pendingPayments, pendingRefunds] = await Promise.all([
    prisma.payment.count({ where: { status: 'pending' } }),
    prisma.refund.count({ where: { status: 'pending' } }),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav user={user} pendingPayments={pendingPayments} pendingRefunds={pendingRefunds} />
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
