export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ContactForm from '@/components/custom/ContactForm'

export default async function AdminEditContactPage({ params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, phone: true, email: true, zalo_id: true,
      date_of_birth: true, address: true, gender: true, source: true, status: true,
    },
  })

  if (!contact) notFound()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/admin/contacts" className="hover:text-flame">Contacts</Link>
        <span>/</span>
        <Link href={`/admin/contacts/${contact.id}`} className="hover:text-flame truncate">{contact.name}</Link>
        <span>/</span>
        <span className="text-ink">Chỉnh sửa</span>
      </div>

      <h1 className="text-xl font-bold text-[#E8471A] mb-6">Chỉnh sửa Contact</h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <ContactForm
          mode="edit"
          contactId={contact.id}
          successRedirect={`/admin/contacts/${contact.id}`}
          defaultValues={{
            name: contact.name,
            phone: contact.phone,
            email: contact.email ?? '',
            zalo_id: contact.zalo_id ?? '',
            date_of_birth: contact.date_of_birth ? contact.date_of_birth.toISOString().split('T')[0] : '',
            address: contact.address ?? '',
            gender: contact.gender ?? '',
            source: contact.source,
            status: contact.status,
          }}
        />
      </div>
    </div>
  )
}
