export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import ThemeToggle from '@/components/custom/ThemeToggle'
import SettingsUsersClient from '@/components/custom/SettingsUsersClient'

export default async function SettingsPage() {
  const currentUser = await getCurrentUser()

  const users = await prisma.user.findMany({
    select: { id: true, email: true, full_name: true, role: true, phone: true, is_active: true, created_at: true },
    orderBy: { created_at: 'asc' },
  })

  return (
    <div>
      <div className="text-sm text-gray-400 mb-4">Cài đặt</div>
      <h1 className="text-2xl font-bold text-ink mb-6">Cài đặt hệ thống</h1>

      <div className="space-y-6">
        {/* Card 1: Giao diện */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Giao diện</h2>
          <ThemeToggle />
        </div>

        {/* Card 2: Quản lý người dùng */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Quản lý người dùng</h2>
          <SettingsUsersClient
            users={users}
            currentUserId={currentUser?.id ?? ''}
          />
        </div>
      </div>
    </div>
  )
}
