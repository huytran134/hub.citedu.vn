export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import NewClassForm from './NewClassForm'

export default async function NewClassPage() {
  const [programs, homerooms] = await Promise.all([
    prisma.program.findMany({
      where: { is_active: true },
      orderBy: [{ branch: 'asc' }, { level: 'asc' }],
    }),
    prisma.user.findMany({
      where: { is_active: true },
      orderBy: { full_name: 'asc' },
    }),
  ])

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#E8471A] uppercase tracking-wide">Tạo lớp mới</h1>
      </div>
      <NewClassForm
        programs={programs.map((p) => ({ ...p, price: Number(p.price) }))}
        homerooms={homerooms}
      />
    </div>
  )
}
