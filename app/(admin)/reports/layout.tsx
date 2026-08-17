import ReportsTabs from '@/components/custom/ReportsTabs'

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ReportsTabs />
      {children}
    </div>
  )
}
