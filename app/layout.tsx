import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CiT Hub',
  description: 'Hệ thống CRM + LMS nội bộ CiT EDU',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
