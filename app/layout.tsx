import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'CiT Hub',
  description: 'Hệ thống CRM + LMS nội bộ CiT EDU',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Chống flash trắng khi reload ở dark mode */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('cithub-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
