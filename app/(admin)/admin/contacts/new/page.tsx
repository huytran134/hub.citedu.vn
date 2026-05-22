import Link from 'next/link'
import ContactForm from '@/components/custom/ContactForm'

export default function AdminNewContactPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/admin/contacts" className="hover:text-flame">Contacts</Link>
        <span>/</span>
        <span className="text-ink">Thêm mới</span>
      </div>

      <h1 className="text-xl font-bold text-ink mb-6">Thêm Contact mới</h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <ContactForm
          mode="create"
          successRedirect="/admin/contacts"
          createRedirectBase="/admin/contacts"
        />
      </div>
    </div>
  )
}
