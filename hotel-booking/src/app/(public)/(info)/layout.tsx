import InfoSidebar from '@/components/layout/info-sidebar'

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        <div className="flex gap-10 items-start">
          {/* Sidebar — hidden on mobile, sticky on desktop */}
          <aside className="hidden lg:block w-56 shrink-0 sticky top-28 self-start">
            <InfoSidebar />
          </aside>
          {/* Page content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}