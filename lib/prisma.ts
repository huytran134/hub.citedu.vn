import { PrismaClient } from '@prisma/client'

// Các bảng có soft delete — middleware tự lọc deleted_at = null
const SOFT_DELETE_MODELS = new Set([
  'Contact', 'ContactNote', 'Lead', 'LeadNote',
  'Program', 'Class', 'ClassSession',
  'Enrollment', 'Payment', 'Refund',
  'Lesson',
])

const FILTER_ACTIONS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow',
  'findUnique', 'findUniqueOrThrow',
  'count', 'aggregate', 'groupBy',
])

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

  // Middleware tự động thêm where: { deleted_at: null } cho các bảng có soft delete.
  // Nếu query đã tự set deleted_at (ví dụ admin xem bản ghi đã xóa), middleware không ghi đè.
  client.$use(async (params, next) => {
    if (
      params.model &&
      SOFT_DELETE_MODELS.has(params.model) &&
      FILTER_ACTIONS.has(params.action)
    ) {
      params.args ??= {}
      params.args.where ??= {}
      if (!('deleted_at' in params.args.where)) {
        params.args.where.deleted_at = null
      }
    }
    return next(params)
  })

  return client
}

// Singleton — tránh tạo nhiều connection trong development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
