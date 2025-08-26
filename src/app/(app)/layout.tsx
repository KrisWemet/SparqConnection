import BottomNav from '@/components/nav/bottom-nav'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
      <BottomNav />
    </div>
  )
}

