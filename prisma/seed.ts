// =============================================================================
// seed.ts — Tạo tài khoản hệ thống CiT Hub
// Chạy: npm run db:seed
//
// Script này làm 2 việc tự động:
//   1. Tạo user trong Supabase Auth (email + password)
//   2. Upsert bản ghi User vào database (id, email, full_name, role)
//
// Yêu cầu: NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import { PrismaClient, UserRole } from '@prisma/client'
import ws from 'ws'

const prisma = new PrismaClient()

// Kiểm tra env vars bắt buộc
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('\n❌ Thiếu biến môi trường!')
  console.error('   Cần có trong .env.local:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=...')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=...\n')
  process.exit(1)
}

// Admin client — dùng service role key để tạo user không cần xác nhận email
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  // Node.js 20 thiếu native WebSocket — phải truyền thủ công
  realtime: { transport: ws as unknown as typeof WebSocket },
})

// ─── Danh sách tài khoản cần tạo ─────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getExistingAuthUserId(email: string): Promise<string | null> {
  // listUsers trả về theo trang — với số lượng nhỏ, page 1 là đủ
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 })
  if (error || !data) return null
  return data.users.find((u) => u.email === email)?.id ?? null
}

async function createOrGetAuthUser(account: AccountConfig): Promise<string | null> {
  // Thử tạo mới
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true, // bỏ qua bước xác nhận email — đây là tài khoản nội bộ
  })

  if (!error && data.user) {
    console.log(`  ✅ Auth: Tạo mới thành công (${data.user.id})`)
    return data.user.id
  }

  // Nếu đã tồn tại → lấy UUID hiện tại
  if (
    error?.message.toLowerCase().includes('already') ||
    error?.message.toLowerCase().includes('registered') ||
    error?.message.toLowerCase().includes('exists')
  ) {
    const existingId = await getExistingAuthUserId(account.email)
    if (existingId) {
      console.log(`  ℹ️  Auth: Đã tồn tại (${existingId})`)
      return existingId
    }
  }

  console.error(`  ❌ Auth: Lỗi — ${error?.message}`)
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 CiT Hub — Seed tài khoản hệ thống\n')
  console.log('─'.repeat(50))

  let successCount = 0
  let skipCount = 0

  for (const account of ACCOUNTS) {
    console.log(`\n👤 ${account.full_name} <${account.email}> [${account.role}]`)

    // Bước 1: Tạo / lấy UUID từ Supabase Auth
    const userId = await createOrGetAuthUser(account)
    if (!userId) {
      console.log('  ⚠️  Bỏ qua — không lấy được UUID')
      skipCount++
      continue
    }

    // Bước 2: Upsert bản ghi User trong database
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: {
          email: account.email,
          full_name: account.full_name,
          role: account.role,
          is_active: true,
        },
        create: {
          id: userId,
          email: account.email,
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
    console.log('📋 Thông tin đăng nhập:')
    console.log('   huytran@citedu.vn  / Cit12345  (Admin)')
    console.log('   cnl1@citedu.vn     / Cit2026   (CNL)')
    console.log('   cnl2@citedu.vn     / Cit2026   (CNL)')
    console.log('')
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Seed thất bại:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
