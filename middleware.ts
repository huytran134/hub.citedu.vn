// =============================================================================
// middleware.ts — Chạy trên Edge Runtime, áp dụng cho gần như mọi route.
//
// QUAN TRỌNG: file này và mọi thứ nó import KHÔNG được đụng tới Prisma hay
// bcryptjs (native binding, crash ngay trên Edge Runtime — lỗi sẽ chỉ hiện
// "{}" trong log, không có message/stack, rất khó debug). Vì vậy dùng
// lib/auth.config.ts (bản rút gọn, không có Credentials provider), KHÔNG
// dùng lib/auth.ts (bản đầy đủ, có Prisma/bcrypt).
// =============================================================================
import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ['/login']
const PUBLIC_PREFIXES = ['/feedback', '/api/auth']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  // Chưa đăng nhập → redirect về /login (trừ các route public)
  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Đã đăng nhập mà vào /login hoặc / → redirect vào app (login page xử lý role)
  if (isLoggedIn && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Áp dụng cho tất cả route, bỏ qua static files và _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
