'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Hotel, LayoutDashboard, BedDouble, Calendar, DollarSign,
  MessageSquare, Settings, LogOut, Menu, X, Bell, Users, ClipboardList,
  UserCog, Sparkles, PackagePlus, Activity, Clock3,
  Building,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { icon: React.ElementType; label: string; path: string; end?: boolean; badge?: string }
type Group = { label: string; items: Item[] }

// ─────────────────────────────────────────────────────────
// Matches the React design's HotelAdminLayout 1:1 for sizing (w-64/w-20
// sidebar, h-20 header, h-16 topbar), animation (animate-fade-in-left,
// gradient active state), icons, and mobile drawer behavior. Nav content
// is ours: Operations/Property/Business groups kept exactly as the dummy
// had them, with Master Data Requests and Activity Log added (new in our
// plan, not in the dummy). Documents moved OUT of the sidebar — it now
// lives inside the Property page's tabs instead, per your latest note.
// Notification bell is simplified to badge + click-through for now (no
// dropdown panel yet — same scope decision made for the System Admin bell).
// ─────────────────────────────────────────────────────────

export default function HotelAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string; hotel_id: number } | null>(null)
  const [hotelName, setHotelName] = useState<string | null>(null)
  const [draftBadge, setDraftBadge] = useState<string | undefined>(undefined)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'].includes(data.data.actor_type)) {
          setUser({ name: data.data.name, email: data.data.email, hotel_id: data.data.hotel_id })
        } else {
          router.push('/hotel-login')
        }
      })
      .catch(() => router.push('/hotel-login'))
  }, [router])

  useEffect(() => {
    fetch('/api/hotel-admin/hotel', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setHotelName(d?.data?.name ?? null))
      .catch(() => {})
  }, [])

  // Draft Center badge — reflects the hotel's current open case, if any.
  // The endpoint doesn't exist yet, so this fails silently to "no badge"
  // until Draft Center itself is built, same pattern as Review Queue's
  // pending-count badge on the System Admin side.
  useEffect(() => {
    fetch('/api/hotel-admin/cases', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const status = d?.data?.currentCase?.status
        if (status === 'PENDING') setDraftBadge('Review')
        else if (status === 'REJECTED') setDraftBadge('Action')
        else if (status === 'DRAFTING') setDraftBadge('Draft')
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/hotel-admin/notifications/unread-count', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setUnreadCount(d?.data?.count ?? 0))
      .catch(() => setUnreadCount(0))
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    router.push('/hotel-login')
  }

  const groups: Group[] = [
    {
      label: 'Operations',
      items: [
        { icon: LayoutDashboard, label: 'Overview', path: '/dashboard/hotel', end: true },
        { icon: Calendar, label: 'Bookings', path: '/dashboard/hotel/bookings' },
        { icon: Users, label: 'Guests', path: '/dashboard/hotel/guests' },
        { icon: BedDouble, label: 'Rooms & Types', path: '/dashboard/hotel/rooms' },
        { icon: Sparkles, label: 'Room-Pricing', path: '/dashboard/hotel/pricing' },
      ],
    },
    {
      label: 'Property',
      items: [
        { icon: Hotel, label: 'Property', path: '/dashboard/hotel/listing' },
        { icon: Clock3, label: 'Check-in Policy', path: '/dashboard/hotel/policy' },
        { icon: ClipboardList, label: 'Draft Center', path: '/dashboard/hotel/drafts', badge: draftBadge },
        { icon: PackagePlus, label: 'Master Data Requests', path: '/dashboard/hotel/master-data-requests' },
      ],
    },
    {
      label: 'Business',
      items: [
        { icon: UserCog, label: 'Team', path: '/dashboard/hotel/team' },
        { icon: DollarSign, label: 'Revenue', path: '/dashboard/hotel/revenue' },
        { icon: MessageSquare, label: 'Reviews', path: '/dashboard/hotel/reviews' },
      ],
    },
    {
      label: '',
      items: [
        { icon:Bell, label: 'Notifications', path: '/dashboard/hotel/notifications'},
        { icon: Activity, label: 'Activity Log', path: '/dashboard/hotel/activity-log' },
        { icon: Settings, label: 'Settings', path: '/dashboard/hotel/settings' },
        
      ],
    },
  ]

  const isActive = (item: Item) =>
    item.end ? pathname === item.path : pathname.startsWith(item.path)

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '··'

  return (
    <div className="min-h-screen bg-background">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard/hotel" className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 p-2">
              <Hotel className="h-5 w-5 text-primary-foreground" />
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in-left min-w-0">
                <p className="text-gradient truncate text-sm font-bold">Hotel Admin</p>
                <p className="truncate text-[10px] text-muted-foreground">Property Management</p>
              </div>
            )}
          </Link>
          <button onClick={() => setMobileSidebarOpen(false)} className="rounded-lg p-2 hover:bg-secondary lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-3 custom-scrollbar"data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
          {groups.map((group) => (
            <div key={group.label || 'misc'}>
              {sidebarOpen && group.label && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item)
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={cn(
                        'group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all',
                        active
                          ? 'border border-green-500/20 bg-gradient-to-r from-green-500/15 to-emerald-500/10 text-foreground'
                          : ' hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-green-600')} />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 truncate text-sm font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-600 border border-amber-500/20">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={cn('transition-all duration-300', sidebarOpen ? 'lg:ml-64' : 'lg:ml-20')}>
        <header className="glass-strong sticky top-0 z-30 h-16 border-b border-border">
          <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileSidebarOpen(true)} className="rounded-lg p-2 hover:bg-secondary lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden rounded-lg p-2 hover:bg-secondary lg:flex">
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-2 text-sm sm:flex">
                <Building className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">{hotelName ?? '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard/hotel/notifications')}
                className="relative rounded-lg p-2 transition-colors hover:bg-secondary"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-green-500" />
                )}
              </button>
              <div className="flex items-center gap-3 border-l border-border pl-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                  <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium leading-tight pb-1">{user?.name}</p>
                  <p className="text-xs leading-tight text-muted-foreground">
                    {user?.email }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}