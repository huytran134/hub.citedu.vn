import ClassesSectionTabs from '@/components/custom/ClassesSectionTabs'

export default function ClassesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ClassesSectionTabs />
      {children}
    </div>
  )
}
