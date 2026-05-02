'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Building2, Users, MapPin, Star, Settings, LogOut, Menu, X, ChevronDown, ChevronRight } from 'lucide-react'

type NavLink = {
  name: string
  href?: string
  icon: any
  subLinks?: { name: string; href: string }[]
}

const systemAdminLinks: NavLink[] = [
  { name: 'Overview', href: '/dashboard/system', icon: Building2 },
  { 
    name: 'Hotels', 
    icon: Building2,
    subLinks: [
      { name: 'All Hotels', href: '/dashboard/system/hotels' },
      { name: 'Add Hotel', href: '/dashboard/system/hotels/new' }
    ]
  },
  { name: 'Cities', href: '/dashboard/system/cities', icon: MapPin },
  { name: 'Hotel Types', href: '/dashboard/system/hotel-types', icon: Star },
  { name: 'Amenities', href: '/dashboard/system/amenities', icon: Star },
  { name: 'Admins', href: '/dashboard/system/admins', icon: Users },
  { name: 'Users', href: '/dashboard/system/users', icon: Users },
  { name: 'Settings', href: '/dashboard/system/settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ Hotels: true })

  const toggleMenu = (menuName: string) => {
    setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }))
  }

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.actor_type === 'SYSTEM_ADMIN') {
          setUser({ name: data.data.name, email: data.data.email })
        } else {
          router.push('/admin-login')
        }
      })
      .catch(() => router.push('/admin-login'))
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    router.push('/admin-login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <span className="font-bold text-lg">System Admin</span>
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
            <h2 className="text-xl font-bold">System Admin</h2>
            {user && (
              <p className="text-sm text-muted-foreground mt-1">{user.name}</p>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {systemAdminLinks.map((link) => {
              const Icon = link.icon

              if (link.subLinks) {
                const isOpen = openMenus[link.name]
                return (
                  <div key={link.name} className="space-y-1">
                    <button 
                      onClick={() => toggleMenu(link.name)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-muted-foreground font-medium hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span>{link.name}</span>
                      </div>
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {isOpen && (
                      <div className="space-y-1 ml-4 pl-4 border-l border-border">
                        {link.subLinks.map((sub) => {
                          const isSubActive = pathname === sub.href
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm ${
                                isSubActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <span>{sub.name}</span>
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
                  key={link.href}
                  href={link.href!}
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