import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-helpers'
import CnlBottomNav from '@/components/custom/CnlBottomNav'

export default async function CnlLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (user.role !== 'ADMIN' && user.role !== 'HOMEROOM') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <nav className="bg-navy text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold">CiT Hub</span>
        <span className="text-white/70 text-sm">{user.full_name}</span>
      </nav>

      <main className="p-4">{children}</main>

      {/* Bottom navigation — CNL dùng điện thoại, nút tối thiểu 44px */}
      <CnlBottomNav />
    </div>
  )
}
