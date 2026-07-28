'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  Building2,
  CalendarDays,
  Users,
  MapPin,
  Tags,
  Sparkles,
  BedDouble,
  Layers,
  Wrench,
  PackagePlus,
  ShieldCheck,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from 'lucide-react'
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/admin/shared/primitives'

// ─────────────────────────────────────────────────────────
// Nav model — mirrors the React design's OpsShell structure exactly,
// with the additions our locked schema/design requires:
//   - "Work Queue" renamed to "Review Queue" throughout
//   - Room Types + Room Facilities added to Catalog
//   - Master Data Requests + Notifications added to Platform
//   - All routes point at this app's real /dashboard/system/* paths
// ─────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

const primaryNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/system', icon: LayoutDashboard },
  { label: 'Review Queue', href: '/dashboard/system/review-queue', icon: Inbox },
  { label: 'Hotels', href: '/dashboard/system/hotels', icon: Building2 },
  { label: 'Bookings', href: '/dashboard/system/bookings', icon: CalendarDays },
  { label: 'Users', href: '/dashboard/system/users', icon: Users },
  { label: 'Activity Log', href: '/dashboard/system/activity-log', icon: Activity },
]

const catalogNav: NavItem[] = [
  { label: 'Cities', href: '/dashboard/system/cities', icon: MapPin },
  { label: 'Hotel Types', href: '/dashboard/system/hotel-types', icon: Tags },
  { label: 'Amenities', href: '/dashboard/system/amenities', icon: Sparkles },
  { label: 'Bed Types', href: '/dashboard/system/bed-types', icon: BedDouble },
  { label: 'Room Types', href: '/dashboard/system/room-types', icon: Layers },
  { label: 'Room Facilities', href: '/dashboard/system/room-facilities', icon: Wrench },
]

const platformNav: NavItem[] = [
  { label: 'System Admins', href: '/dashboard/system/admins', icon: ShieldCheck },
  { label: 'Master Data Requests', href: '/dashboard/system/master-data-requests', icon: PackagePlus },
  { label: 'Notifications', href: '/dashboard/system/notifications', icon: Bell },
  { label: 'Platform Settings', href: '/dashboard/system/settings', icon: Settings },
]

const routeCrumbs: Record<string, string> = {
  '/dashboard/system': 'Dashboard',
  '/dashboard/system/review-queue': 'Review Queue',
  '/dashboard/system/hotels': 'Hotels',
  '/dashboard/system/hotels/new': 'Hotels · Create',
  '/dashboard/system/bookings': 'Bookings',
  '/dashboard/system/users': 'Users',
  '/dashboard/system/activity-log': 'Activity Log',
  '/dashboard/system/cities': 'Catalog · Cities',
  '/dashboard/system/hotel-types': 'Catalog · Hotel Types',
  '/dashboard/system/amenities': 'Catalog · Amenities',
  '/dashboard/system/bed-types': 'Catalog · Bed Types',
  '/dashboard/system/room-types': 'Catalog · Room Types',
  '/dashboard/system/room-facilities': 'Catalog · Room Facilities',
  '/dashboard/system/admins': 'System Admins',
  '/dashboard/system/master-data-requests': 'Master Data Requests',
  '/dashboard/system/notifications': 'Notifications',
  '/dashboard/system/settings': 'Platform Settings',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

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

  // Review Queue badge count. The /api/system-admin/cases endpoint doesn't
  // exist yet (Review Queue hasn't been built) — this fails silently and
  // just shows no badge until that page/API is built.
  useEffect(() => {
    fetch('/api/system-admin/cases?status=PENDING&limit=1', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setPendingCount(data?.data?.total ?? 0))
      .catch(() => setPendingCount(0))
  }, [])

  // Notification bell unread count. Same story — /api/system-admin/notifications/unread-count
  // doesn't exist yet either. Fails silently to 0 until Notifications is built.
  useEffect(() => {
    fetch('/api/system-admin/notifications/unread-count', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setUnreadCount(data?.data?.count ?? 0))
      .catch(() => setUnreadCount(0))
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    router.push('/admin-login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard/system') return pathname === '/dashboard/system'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const crumb =
    routeCrumbs[pathname] ??
    (pathname.startsWith('/dashboard/system/review-queue/') ? `Review Queue · ${pathname.split('/').pop()}` : null) ??
    (pathname.startsWith('/dashboard/system/hotels/') ? 'Hotels · Workspace' : null) ??
    (pathname.startsWith('/dashboard/system/bookings/') ? 'Bookings · Detail' : null) ??
    (pathname.startsWith('/dashboard/system/users/') ? 'Users · Detail' : null) ??
    'Admin'

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      const active = isActive(item.href)
      const badge = item.label === 'Review Queue' ? pendingCount : item.badge
      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'group flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] transition-colors',
            active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
            collapsed && 'justify-center',
          )}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-primary">
                  {badge}
                </span>
              )}
            </>
          )}
        </Link>
      )
    })

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '··'

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'sticky top-0 flex h-screen shrink-0 flex-col border-r border-border/60 bg-card/40 transition-[width] duration-200',
          collapsed ? 'w-14' : 'w-60',
        )}
      >
        <div className="flex h-12 items-center gap-2 border-b border-border/60 px-3">
          <div className="grid h-6 w-6 place-items-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">
            GB
          </div>
          {!collapsed && (
            <div className="flex flex-1 items-baseline gap-1.5 truncate">
              <span className="text-[13px] font-semibold">GhuriBangla</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Portal</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-sm p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
          <div className="space-y-0.5">{renderNav(primaryNav)}</div>
          <div className="space-y-0.5">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Catalog
              </div>
            )}
            {renderNav(catalogNav)}
          </div>
          <div className="space-y-0.5">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Platform
              </div>
            )}
            {renderNav(platformNav)}
          </div>
        </nav>

        <div className="border-t border-border/60 p-2">
          <button
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground',
              collapsed && 'justify-center',
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span>Admin</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground">{crumb}</span>
          </div>

          {/* Search — visual only for now. Wiring this up to an actual
              command palette (⌘K) is deferred until components/ui/command.tsx
              is built; this button intentionally does nothing yet. */}
          <div className="mx-auto w-full max-w-md">
            <button className="flex w-full items-center gap-2 rounded-sm border border-border/60 bg-secondary/40 px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:border-border hover:bg-secondary/70">
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1">Search cases, hotels, users…</span>
              <Kbd>⌘K</Kbd>
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-sm border border-border/60 bg-secondary/40 px-2 py-1.5 text-xs hover:bg-secondary">
              <Plus className="h-3.5 w-3.5" />
              New
              <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Quick Create
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push('/dashboard/system/hotels/new')}>
                <Building2 className="mr-2 h-3.5 w-3.5" /> Add Hotel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/system/admins?new=1')}>
                System Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/system/cities?new=1')}>
                City
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/system/amenities?new=1')}>
                Amenity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/system/review-queue')}>
                Open Review Queue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => router.push('/dashboard/system/notifications')}
            className="relative rounded-sm p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-sm border border-border/60 bg-secondary/40 py-1 pl-1 pr-2 text-xs hover:bg-secondary">
              <div className="grid h-6 w-6 place-items-center rounded-sm bg-primary/15 text-[10px] font-bold text-primary">
                {initials}
              </div>
              <span className="hidden sm:inline">{user?.name ?? '—'}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="text-sm">{user?.name ?? '—'}</div>
                <div className="text-[10px] text-muted-foreground">{user?.email ?? ''}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/system/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}