'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Building2, Bed, Calendar, Users, Image, Settings, LogOut, Menu, X } from 'lucide-react'

const hotelAdminLinks = [
  { name: 'Overview', href: '/dashboard/hotel', icon: Building2 },
  { name: 'Room Types', href: '/dashboard/hotel/room-types', icon: Bed },
  { name: 'Rooms', href: '/dashboard/hotel/rooms', icon: Bed },
  { name: 'Bookings', href: '/dashboard/hotel/bookings', icon: Calendar },
  { name: 'Staff', href: '/dashboard/hotel/staff', icon: Users },
  { name: 'Images', href: '/dashboard/hotel/images', icon: Image },
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
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform lg:transform-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Hotel Admin</h2>
            {user && (
              <p className="text-sm text-muted-foreground mt-1">{user.name}</p>
            )}
          </div>

          <nav className="p-4 space-y-1">
            {hotelAdminLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
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