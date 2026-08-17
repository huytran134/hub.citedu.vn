'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (!result || result.error) {
        setError('Email hoặc mật khẩu không đúng')
        return
      }

      // Đọc role từ DB để redirect đúng chỗ
      const meRes = await fetch('/api/me')
      if (meRes.ok) {
        const me = await meRes.json()
        router.push(me.role === 'ADMIN' ? '/dashboard' : '/today')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <div className="w-full max-w-sm mx-4">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wider">CiT Hub</h1>
          <p className="text-white/60 mt-2 text-sm">Hệ thống quản lý nội bộ CiT EDU</p>
        </div>

        <form onSubmit={handleLogin} className="bg-background rounded-xl p-8 shadow-2xl space-y-5 border border-border">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@citedu.vn"
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-border rounded-lg text-foreground bg-background
                         focus:outline-none focus:ring-2 focus:ring-flame focus:border-transparent
                         placeholder:text-muted-foreground/70 text-base"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-border rounded-lg text-foreground bg-background
                         focus:outline-none focus:ring-2 focus:ring-flame focus:border-transparent
                         placeholder:text-muted-foreground/70 text-base"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-flame text-white font-semibold rounded-lg
                       hover:bg-flame-light transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}
