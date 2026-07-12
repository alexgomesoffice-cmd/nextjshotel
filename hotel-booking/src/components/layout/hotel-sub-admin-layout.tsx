'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Building2, Bed, Calendar, LogOut, Menu, X } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { useToast } from '@/hooks/use-toast'

const subAdminLinks = [
  { name: 'Overview', href: '/dashboard/sub', icon: Building2 },
  { name: 'Rooms', href: '/dashboard/sub/rooms', icon: Bed },
  { name: 'Bookings', href: '/dashboard/sub/bookings', icon: Calendar },
]

export default function HotelSubAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const socket = useSocket()
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.actor_type === 'HOTEL_SUB_ADMIN') {
          setUser({ id: data.data.actor_id, name: data.data.name, email: data.data.email })
        } else {
          router.push('/hotel-login')
        }
      })
      .catch(() => router.push('/hotel-login'))
  }, [router])

  const handleLogout = useCallback(async (forcedMessage?: string) => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      if (forcedMessage) {
        toast({ title: 'Session Ended', description: forcedMessage, variant: 'destructive' })
      }
    } catch {
      // ignore
    }
    router.push('/hotel-login')
  }, [router, toast])

  useEffect(() => {
    if (!socket || !user) return

    const onBlocked = () => handleLogout('Your account has been blocked by an administrator.')
    const onDeleted = () => handleLogout('Your account has been removed by an administrator.')

    socket.on('staff:blocked', onBlocked)
    socket.on('staff:deleted', onDeleted)

    return () => {
      socket.off('staff:blocked', onBlocked)
      socket.off('staff:deleted', onDeleted)
    }
  }, [socket, user, handleLogout])

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 ">
        <span className="font-bold text-lg">Sub Admin</span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-card  flex flex-col transform transition-transform lg:transform-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-6  shrink-0">
            <h2 className="text-xl font-bold">Sub Admin</h2>
            {user && (
              <p className="text-sm text-muted-foreground mt-1">{user.name}</p>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {subAdminLinks.map((link) => {
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

          <div className="p-4  shrink-0">
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