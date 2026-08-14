// =============================================================================
// seed.ts — Tạo tài khoản hệ thống CiT Hub
// Chạy: npm run db:seed
//
// Upsert trực tiếp vào bảng User với password_hash (bcrypt) — không còn phụ
// thuộc dịch vụ Auth ngoài.
// =============================================================================

import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

interface AccountConfig {
  email: string
  password: string
  full_name: string
  role: UserRole
}

const ACCOUNTS: AccountConfig[] = [
  {
    email: 'huytran@citedu.vn',
    password: 'Cit12345',
    full_name: 'Giám đốc Huy Trần',
    role: UserRole.ADMIN,
  },
  {
    email: 'cnl1@citedu.vn',
    password: 'Cit2026',
    full_name: 'CNL 1',
    role: UserRole.HOMEROOM,
  },
  {
    email: 'cnl2@citedu.vn',
    password: 'Cit2026',
    full_name: 'CNL 2',
    role: UserRole.HOMEROOM,
  },
]

async function main() {
  console.log('\n🌱 CiT Hub — Seed tài khoản hệ thống\n')
  console.log('─'.repeat(50))

  let successCount = 0
  let skipCount = 0

  for (const account of ACCOUNTS) {
    console.log(`\n👤 ${account.full_name} <${account.email}> [${account.role}]`)

    try {
      const password_hash = await bcrypt.hash(account.password, 12)

      await prisma.user.upsert({
        where: { email: account.email },
        update: {
          full_name: account.full_name,
          role: account.role,
          is_active: true,
          // Không ghi đè password_hash khi user đã tồn tại — tránh vô tình
          // reset mật khẩu ai đó đã tự đổi. Dùng route reset-password để đổi.
        },
        create: {
          email: account.email,
          password_hash,
          full_name: account.full_name,
          role: account.role,
          is_active: true,
        },
      })
      console.log(`  ✅ DB: Upsert thành công`)
      successCount++
    } catch (err) {
      console.error(`  ❌ DB:`, err)
      skipCount++
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`\n✅ Hoàn thành: ${successCount} tài khoản · ${skipCount} bỏ qua\n`)

  if (successCount > 0) {
    console.log('📋 Thông tin đăng nhập (chỉ áp dụng cho tài khoản MỚI tạo lần đầu):')
    console.log('   huytran@citedu.vn  / Cit12345  (Admin)')
    console.log('   cnl1@citedu.vn     / Cit2026   (CNL)')
    console.log('   cnl2@citedu.vn     / Cit2026   (CNL)')
    console.log('\n⚠️  Đổi các mật khẩu mặc định này ngay sau lần đăng nhập đầu tiên.\n')
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Seed thất bại:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
