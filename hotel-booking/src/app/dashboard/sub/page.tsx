'use client'

import { useState, useEffect } from 'react'
import { Bed, Calendar, CheckCircle2, AlertCircle, Wrench, Plus, LogIn, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashStats {
  rooms: { total: number; available: number; occupied: number; maintenance: number }
  bookings: { total: number; reserved: number; booked: number; checkedIn: number }
  recentBookings: { id: number; reference: string; guest: string; status: string; total: number }[]
}

const STATUS_BADGE: Record<string, string> = {
  RESERVED: 'bg-amber-500/20  text-amber-700  border-amber-500/30',
  BOOKED: 'bg-blue-500/20   text-blue-700   border-blue-500/30',
  CHECKED_IN: 'bg-green-500/20  text-green-700  border-green-500/30',
  CHECKED_OUT: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  CANCELLED: 'bg-red-500/20    text-red-700    border-red-500/30',
  EXPIRED: 'bg-gray-500/20   text-gray-600   border-gray-500/30',
  NO_SHOW: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
}

const STATUS_LABEL: Record<string, string> = {
  RESERVED: 'Reserved', BOOKED: 'Confirmed', CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Checked Out', CANCELLED: 'Cancelled', EXPIRED: 'Expired', NO_SHOW: 'No Show',
}

function StatCard({
  title, value, sub, icon: Icon, color, loading
}: {
  title: string; value: number; sub?: string; icon: React.ElementType; color: string; loading: boolean
}) {
  return (
    <Card className="glass-strong">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading
              ? <Skeleton className="h-8 w-16 mt-1" />
              : <p className="text-3xl font-bold mt-0.5">{value}</p>
            }
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn('h-12 w-12 rounded-full flex items-center justify-center', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SubAdminPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashStats>({
    rooms: { total: 0, available: 0, occupied: 0, maintenance: 0 },
    bookings: { total: 0, reserved: 0, booked: 0, checkedIn: 0 },
    recentBookings: []
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const [roomsRes, bookingsRes] = await Promise.all([
          fetch('/api/hotel-admin/rooms?limit=200', { credentials: 'include' }),
          fetch('/api/hotel-admin/bookings?limit=5', { credentials: 'include' }),
        ])

        const roomsData = await roomsRes.json()
        const bookingsData = await bookingsRes.json()

        const roomList = roomsData.success
          ? (roomsData.data.rooms ?? roomsData.data ?? [])
          : []

        const bookingList = bookingsData.success ? (bookingsData.data.bookings || []) : []

        setStats({
          rooms: {
            total: roomList.length,
            available: roomList.filter((r: { status: string }) => r.status === 'AVAILABLE').length,
            occupied: roomList.filter((r: { status: string }) => r.status === 'UNAVAILABLE').length,
            maintenance: roomList.filter((r: { status: string }) => r.status === 'MAINTENANCE').length,
          },
          bookings: {
            total: bookingsData.success ? (bookingsData.data.pagination?.total ?? 0) : 0,
            reserved: bookingList.filter((b: { status: string }) => b.status === 'RESERVED').length,
            booked: bookingList.filter((b: { status: string }) => b.status === 'BOOKED').length,
            checkedIn: bookingList.filter((b: { status: string }) => b.status === 'CHECKED_IN').length,
          },
          recentBookings: bookingList.slice(0, 5).map((b: {
            id: number; booking_reference: string; end_user?: { name: string }; status: string; total_price: number
          }) => ({
            id: b.id,
            reference: b.booking_reference,
            guest: b.end_user?.name || 'Unknown',
            status: b.status,
            total: b.total_price,
          })),
        })
      } catch {
        toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [toast])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage rooms and bookings for your hotel.</p>
      </div>

      {/* Room Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Rooms" value={stats.rooms.total} icon={Bed} color="bg-primary/10 text-primary" loading={loading} />
        <StatCard title="Available" value={stats.rooms.available} icon={CheckCircle2} color="bg-green-500/10 text-green-600" loading={loading} />
        <StatCard title="Occupied" value={stats.rooms.occupied} icon={AlertCircle} color="bg-blue-500/10 text-blue-600" loading={loading} />
        <StatCard title="Maintenance" value={stats.rooms.maintenance} icon={Wrench} color="bg-amber-500/10 text-amber-600" loading={loading} />
      </div>

      {/* Booking Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={stats.bookings.total} icon={Calendar} color="bg-primary/10 text-primary" loading={loading} />
        <StatCard title="Reserved" value={stats.bookings.reserved} icon={Clock} color="bg-amber-500/10 text-amber-600" loading={loading} />
        <StatCard title="Confirmed" value={stats.bookings.booked} icon={CheckCircle2} color="bg-blue-500/10 text-blue-600" loading={loading} />
        <StatCard title="Checked In" value={stats.bookings.checkedIn} icon={LogIn} color="bg-green-500/10 text-green-600" loading={loading} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/sub/rooms">
          <Button className="gap-2"><Bed className="h-4 w-4" /> Manage Rooms</Button>
        </Link>
        <Link href="/dashboard/sub/rooms/new">
          <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Room</Button>
        </Link>
        <Link href="/dashboard/sub/bookings">
          <Button variant="outline" className="gap-2"><Calendar className="h-4 w-4" /> View Bookings</Button>
        </Link>
      </div>

      {/* Recent Bookings */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Latest booking activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
            ) : stats.recentBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No bookings yet.</p>
            ) : (
              stats.recentBookings.map(booking => (
                <Link key={booking.id} href={`/dashboard/sub/bookings/${booking.reference}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
                    <div>
                      <p className="font-medium font-mono text-sm">{booking.reference}</p>
                      <p className="text-sm text-muted-foreground">{booking.guest}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">৳{booking.total.toLocaleString()}</p>
                      <Badge variant="outline" className={cn('text-xs mt-0.5', STATUS_BADGE[booking.status] ?? '')}>
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}