'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bell,
  Building2,
  CircleAlert,
  Globe,
  Hotel,
  LayoutGrid,
  MapPinned,
  PackagePlus,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface OverviewData {
  hotels: { total: number; published: number; draft: number; suspended: number }
  users: { total: number; active: number; blocked: number }
  bookings: { total: number; reserved: number; booked: number; cancelled: number }
  cities: { total: number; active: number }
  admins: { total: number }
}

interface DashboardNotification {
  id: number
  title: string
  message: string
  created_at: string
  is_read: boolean
  related_entity_type?: string | null
  related_entity_id?: number | null
}

interface DashboardMetricCardProps {
  label: string
  value: string | number
  detail: string
  icon: typeof Building2
  accent: string
  loading?: boolean
}

const formatRelativeTime = (input: string) => {
  const diffMs = Date.now() - new Date(input).getTime()
  const minutes = Math.max(0, Math.round(diffMs / 60000))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function StatCard({ label, value, detail, icon: Icon, accent, loading = false }: DashboardMetricCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          )}
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={cn('rounded-xl border p-2.5', accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

export default function SystemAdminPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [notifications, setNotifications] = useState<DashboardNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchDashboard = async () => {
      try {
        setLoading(true)
        setErrorMessage(null)

        const [overviewRes, pendingRes, notificationsRes] = await Promise.all([
          fetch('/api/system-admin/overview', { credentials: 'include' }),
          fetch('/api/system-admin/master-data-requests?status=PENDING&limit=1', { credentials: 'include' }),
          fetch('/api/system-admin/notifications?limit=5', { credentials: 'include' }),
        ])

        const overviewData = await overviewRes.json()
        const pendingData = await pendingRes.json()
        const notificationsData = await notificationsRes.json()

        if (!overviewRes.ok || !overviewData?.success) {
          throw new Error(overviewData?.message || 'Overview could not be loaded.')
        }

        if (!pendingRes.ok || !pendingData?.success) {
          throw new Error(pendingData?.message || 'Request count could not be loaded.')
        }

        if (!notificationsRes.ok || !notificationsData?.success) {
          throw new Error(notificationsData?.message || 'Recent activity could not be loaded.')
        }

        if (!isMounted) return

        setOverview(overviewData.data)
        setPendingRequests(Number(pendingData.summary?.pending ?? 0))
        setNotifications(Array.isArray(notificationsData.data) ? notificationsData.data : [])
      } catch (error) {
        console.error('Failed to load system dashboard:', error)
        if (isMounted) {
          setErrorMessage('Platform metrics are temporarily unavailable.')
          setOverview(null)
          setPendingRequests(0)
          setNotifications([])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void fetchDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const quickActions = useMemo(
    () => [
      { label: 'Add Hotel', href: '/dashboard/system/hotels/new', icon: Building2, tone: 'bg-primary/10 text-primary' },
      { label: 'Manage Hotels', href: '/dashboard/system/hotels', icon: Hotel, tone: 'bg-emerald-500/10 text-emerald-600' },
      { label: 'Review Requests', href: '/dashboard/system/master-data-requests', icon: PackagePlus, tone: 'bg-amber-500/10 text-amber-600' },
      { label: 'Hero Banners', href: '/dashboard/system/hero-banners', icon: Sparkles, tone: 'bg-violet-500/10 text-violet-600' },
      { label: 'Platform Settings', href: '/dashboard/system/settings', icon: Wrench, tone: 'bg-slate-500/10 text-slate-600' },
      { label: 'Cities', href: '/dashboard/system/cities', icon: MapPinned, tone: 'bg-cyan-500/10 text-cyan-600' },
    ],
    [],
  )

  const healthSummary = useMemo(() => {
    if (!overview) return null

    return {
      hotelReleaseRate: overview.hotels.total > 0 ? Math.round((overview.hotels.published / overview.hotels.total) * 100) : 0,
      activeUsersRatio: overview.users.total > 0 ? Math.round((overview.users.active / overview.users.total) * 100) : 0,
      userBookingsRatio: overview.bookings.total > 0 ? Math.round((overview.bookings.booked / overview.bookings.total) * 100) : 0,
    }
  }, [overview])

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform overview and actions that need your attention.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          <LayoutGrid className="h-3.5 w-3.5" />
          System Admin
        </div>
      </header>

      {errorMessage ? (
        <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-6 text-amber-700 dark:text-amber-300">
            <CircleAlert className="h-5 w-5" />
            <p className="font-medium">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Hotels"
          value={overview?.hotels.total ?? 0}
          detail="All hotels on the platform"
          icon={Building2}
          accent="border-primary/25 bg-primary/10 text-primary"
          loading={loading}
        />
        <StatCard
          label="Published"
          value={overview?.hotels.published ?? 0}
          detail="Visible to guests"
          icon={Hotel}
          accent="border-emerald-500/25 bg-emerald-500/10 text-emerald-600"
          loading={loading}
        />
        <StatCard
          label="Unpublished"
          value={overview?.hotels.draft ?? 0}
          detail="Not yet public"
          icon={Globe}
          accent="border-amber-500/25 bg-amber-500/10 text-amber-600"
          loading={loading}
        />
        <StatCard
          label="Bookings"
          value={overview?.bookings.total ?? 0}
          detail={`${overview?.bookings.booked ?? 0} confirmed`}
          icon={Bell}
          accent="border-violet-500/25 bg-violet-500/10 text-violet-600"
          loading={loading}
        />
        <StatCard
          label="Active Users"
          value={overview?.users.active ?? 0}
          detail={`${overview?.users.blocked ?? 0} blocked`}
          icon={Users}
          accent="border-sky-500/25 bg-sky-500/10 text-sky-600"
          loading={loading}
        />
        <StatCard
          label="System Admins"
          value={overview?.admins.total ?? 0}
          detail="Platform operators"
          icon={ShieldCheck}
          accent="border-indigo-500/25 bg-indigo-500/10 text-indigo-600"
          loading={loading}
        />
        <StatCard
          label="Cities"
          value={overview?.cities.active ?? 0}
          detail={`${overview?.cities.total ?? 0} total`}
          icon={MapPinned}
          accent="border-cyan-500/25 bg-cyan-500/10 text-cyan-600"
          loading={loading}
        />
        <StatCard
          label="Master Data"
          value={pendingRequests}
          detail="Waiting for review"
          icon={PackagePlus}
          accent="border-rose-500/25 bg-rose-500/10 text-rose-600"
          loading={loading}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Action required</p>
                  <CardTitle className="mt-2 text-xl font-semibold">Review queue</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-32" />
                </div>
              ) : pendingRequests > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-semibold tracking-tight text-foreground">{pendingRequests}</span>
                    <span className="pb-1 text-sm text-muted-foreground">Master Data Requests</span>
                  </div>
                  <p className="text-sm text-muted-foreground">New global catalog requests are waiting for system admin review.</p>
                  <Link
                    href="/dashboard/system/master-data-requests"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                  >
                    Review requests
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xl font-semibold text-foreground">Everything is up to date.</p>
                  <p className="text-sm text-muted-foreground">No pending master data requests are currently waiting for review.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Recent activity</p>
                  <CardTitle className="mt-2 text-xl font-semibold">Platform feed</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                  No recent platform activity.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {formatRelativeTime(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Quick actions</p>
                <CardTitle className="mt-2 text-xl font-semibold">Most used</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.map(({ label, href, icon: Icon, tone }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-left transition hover:border-border hover:bg-muted/40"
                >
                  <div className={cn('rounded-lg p-2.5', tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Platform snapshot</p>
                <CardTitle className="mt-2 text-xl font-semibold">Current state</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Hotels</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Total</span>
                    <strong>{overview?.hotels.total ?? 0}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Published</span>
                    <span>{overview?.hotels.published ?? 0}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Unpublished</span>
                    <span>{overview?.hotels.draft ?? 0}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Users</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Total</span>
                    <strong>{overview?.users.total ?? 0}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Active</span>
                    <span>{overview?.users.active ?? 0}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Blocked</span>
                    <span>{overview?.users.blocked ?? 0}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Bookings</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Total</span>
                    <strong>{overview?.bookings.total ?? 0}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Reserved</span>
                    <span>{overview?.bookings.reserved ?? 0}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Booked</span>
                    <span>{overview?.bookings.booked ?? 0}</span>
                  </div>
                </div>
              </div>

              {healthSummary ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>Hotels live</span>
                      <span className="font-medium">{healthSummary.hotelReleaseRate}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${healthSummary.hotelReleaseRate}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>Active users</span>
                      <span className="font-medium">{healthSummary.activeUsersRatio}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${healthSummary.activeUsersRatio}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>Confirmed bookings</span>
                      <span className="font-medium">{healthSummary.userBookingsRatio}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${healthSummary.userBookingsRatio}%` }} />
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}