// =============================================================================
// lib/auth.config.ts — Phần cấu hình NextAuth AN TOÀN CHO EDGE RUNTIME.
//
// File này TUYỆT ĐỐI KHÔNG được import Prisma hay bcryptjs — cả 2 đều dùng
// native binding, không chạy được trong Edge Runtime (nơi middleware.ts chạy).
// Middleware chỉ cần đọc/verify JWT (session đã có sẵn trong cookie), KHÔNG
// cần chạy lại authorize() để so mật khẩu — nên không cần Credentials provider
// ở đây.
//
// lib/auth.ts (phần đầy đủ, có Prisma + bcrypt, chạy Node runtime trong API
// routes) sẽ import file này và bổ sung thêm Credentials provider vào.
// =============================================================================
import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [], // Credentials provider (cần Prisma/bcrypt) chỉ thêm ở lib/auth.ts
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
