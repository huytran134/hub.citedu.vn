import FinanceTabs from '@/components/custom/FinanceTabs'

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <FinanceTabs />
      {children}
    </div>
  )
}
