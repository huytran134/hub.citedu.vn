/**
 * Script xóa ClassSession soft-deleted của lớp test
 * Chạy 1 lần: npx tsx scripts/delete-test-sessions.ts
 *
 * Mục đích: xóa hẳn các buổi học test (deleted_at != null) của lớp
 * "Tư Duy Tài Năng 17.01" để số thứ tự hiển thị lại từ #1.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Tìm lớp theo tên
  const cls = await prisma.class.findFirst({
    where: { name: { contains: 'Tư Duy Tài Năng 17.01' } },
    select: { id: true, name: true },
  })

  if (!cls) {
    console.error('Không tìm thấy lớp "Tư Duy Tài Năng 17.01"')
    process.exit(1)
  }

  console.log(`Tìm thấy lớp: ${cls.name} (${cls.id})`)

  // Đếm trước
  const softDeletedCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM class_sessions
    WHERE class_id = ${cls.id} AND deleted_at IS NOT NULL
  `
  const count = Number(softDeletedCount[0]?.count ?? 0)
  console.log(`Số buổi đã soft delete cần xóa hẳn: ${count}`)

  if (count === 0) {
    console.log('Không có gì để xóa.')
    process.exit(0)
  }

  // Hard delete — bypass middleware bằng $executeRaw
  const result = await prisma.$executeRaw`
    DELETE FROM class_sessions
    WHERE class_id = ${cls.id} AND deleted_at IS NOT NULL
  `
  console.log(`Đã xóa ${result} buổi học test.`)

  // Kiểm tra các buổi còn lại
  const remaining = await prisma.$queryRaw<{ session_number: number; scheduled_at: Date }[]>`
    SELECT session_number, scheduled_at FROM class_sessions
    WHERE class_id = ${cls.id} AND deleted_at IS NULL
    ORDER BY scheduled_at ASC
  `
  console.log(`\nCòn lại ${remaining.length} buổi active:`)
  remaining.forEach((s, i) => {
    console.log(`  Hiển thị #${i + 1} (DB session_number: ${s.session_number}) — ${s.scheduled_at.toLocaleDateString('vi-VN')}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
