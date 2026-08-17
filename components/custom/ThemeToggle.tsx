'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('cithub-theme')
    if (stored === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('cithub-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('cithub-theme', 'light')
    }
  }

  // Tránh hydration mismatch — chỉ render sau khi mount
  if (!mounted) return <div className="h-8" />

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg select-none">{isDark ? '🌙' : '☀️'}</span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggle}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-flame/40 ${
          isDark ? 'bg-navy' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm font-medium text-ink dark:text-gray-200">Giao diện tối</span>
    </div>
  )
}
