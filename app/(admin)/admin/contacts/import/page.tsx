import Link from 'next/link'
import ContactImportClient from '@/components/custom/ContactImportClient'

export default function ContactImportPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/admin/contacts" className="hover:text-flame transition-colors">
          Contacts
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">Import từ Google Sheets</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">
          Import Contacts
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload file CSV export từ Google Sheets — hệ thống tự phát hiện trùng lặp và xung đột
        </p>
      </div>

      <ContactImportClient />
    </div>
  )
}
