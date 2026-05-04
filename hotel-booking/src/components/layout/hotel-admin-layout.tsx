'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Building2, Bed, Calendar, Users, Image, Settings, LogOut, Menu, X, ChevronDown, ChevronRight, Tags } from 'lucide-react'

type NavItem = {
  name: string
  href?: string
  icon: any
  subItems?: { name: string; href: string }[]
}

const hotelAdminLinks: NavItem[] = [
  { name: 'Overview', href: '/dashboard/hotel', icon: Building2 },
  { 
    name: 'Hotel Management', 
    icon: Building2,
    subItems: [
      { name: 'Hotel Profile', href: '/dashboard/hotel/details' },
      { name: 'Images', href: '/dashboard/hotel/images' },
    ]
  },
  { name: 'Amenities', href: '/dashboard/hotel/amenities', icon: Tags },
  { name: 'Bed Types', href: '/dashboard/hotel/bed-types', icon: Bed },
  { name: 'Room Types', href: '/dashboard/hotel/room-types', icon: Bed },
  { name: 'Rooms', href: '/dashboard/hotel/rooms', icon: Bed },
  { name: 'Bookings', href: '/dashboard/hotel/bookings', icon: Calendar },
  { name: 'Staff', href: '/dashboard/hotel/staff', icon: Users },
  { name: 'Settings', href: '/dashboard/hotel/settings', icon: Settings },
]

export default function HotelAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; hotel_id: number } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Hotel Management': true,
    'Amenities & Features': true,
  })

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }))
  }

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.actor_type === 'HOTEL_ADMIN') {
          setUser({ 
            name: data.data.name, 
            email: data.data.email,
            hotel_id: data.data.hotel_id 
          })
        } else {
          router.push('/hotel-login')
        }
      })
      .catch(() => router.push('/hotel-login'))
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    router.push('/hotel-login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <span className="font-bold text-lg">Hotel Admin</span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-card border-r flex flex-col transform transition-transform lg:transform-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-6 border-b shrink-0">
            <h2 className="text-xl font-bold">Hotel Admin</h2>
            {user && (
              <p className="text-sm text-muted-foreground mt-1">{user.name}</p>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {hotelAdminLinks.map((link) => {
              const Icon = link.icon
              const hasSubItems = !!link.subItems

              if (hasSubItems) {
                const isOpen = openMenus[link.name]
                // Check if any subitem is active
                const isAnySubActive = link.subItems?.some(sub => 
                  pathname === sub.href || 
                  (sub.href.includes('?') && pathname === sub.href.split('?')[0])
                )

                return (
                  <div key={link.name} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(link.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors hover:bg-muted ${isAnySubActive ? 'text-primary' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{link.name}</span>
                      </div>
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {isOpen && (
                      <div className="ml-4 pl-4 border-l border-border space-y-1 mt-1">
                        {link.subItems!.map((sub) => {
                          const isSubActive = pathname === sub.href.split('?')[0] // Basic check, could be improved with search params
                          return (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                                isSubActive
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              {sub.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              const isActive = pathname === link.href
              return (
                <Link
                  key={link.name}
                  href={link.href!}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t shrink-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-muted text-destructive"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}