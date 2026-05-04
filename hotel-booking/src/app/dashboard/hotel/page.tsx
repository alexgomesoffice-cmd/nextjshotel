'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Bed, 
  Clock, 
  ShieldCheck, 
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'
import Link from 'next/link'

interface DashboardStats {
  roomTypes: number
  rooms: {
    total: number
    available: number
    occupied: number
    maintenance: number
  }
  bookings: {
    total: number
    reserved: number
    booked: number
    cancelled: number
    checkedIn: number
    checkedOut: number
  }
  revenue: {
    total: number
  }
  recentActivity: {
    id: number
    reference: string
    user: string
    amount: number
    status: string
    date: string
  }[]
}

const StatCard = ({ title, value, icon: Icon, description, loading }: any) => (
  <Card className="glass-strong">
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </>
      )}
    </CardContent>
  </Card>
)

export default function HotelDashboardPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/hotel-admin/overview', { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load dashboard', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [toast])

  return (
    <div className="space-y-8 max-w-(--breakpoint-2xl) mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Manage your hotel operations and view real-time statistics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/hotel/room-types/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Room Type
            </Button>
          </Link>
          <Link href="/dashboard/hotel/rooms">
            <Button variant="outline" className="gap-2">
              Manage Rooms
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Monthly Revenue" 
          value={`৳${stats?.revenue.total.toLocaleString() ?? 0}`} 
          icon={DollarSign}
          description="Total from confirmed bookings"
          loading={loading}
        />
        <StatCard 
          title="Active Bookings" 
          value={stats?.bookings.booked ?? 0} 
          icon={CheckCircle2}
          description="Confirmed but not checked-in"
          loading={loading}
        />
        <StatCard 
          title="Current Guests" 
          value={stats?.bookings.checkedIn ?? 0} 
          icon={Users}
          description="Guests currently in-house"
          loading={loading}
        />
        <StatCard 
          title="Available Rooms" 
          value={stats?.rooms.available ?? 0} 
          icon={Bed}
          description={`Total ${stats?.rooms.total ?? 0} rooms in inventory`}
          loading={loading}
        />
      </div>

      {/* Secondary Stats & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Section */}
        <Card className="lg:col-span-2 glass-strong">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest 5 reservations at your hotel.</CardDescription>
            </div>
            <Link href="/dashboard/hotel/bookings">
              <Button variant="ghost" size="sm" className="gap-2">
                View All <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : stats?.recentActivity.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic">No recent bookings found.</div>
              ) : (
                stats?.recentActivity.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{booking.user}</div>
                        <div className="text-xs text-muted-foreground font-mono">{booking.reference}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">৳{booking.amount.toLocaleString()}</div>
                      <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                        booking.status === 'BOOKED' ? 'bg-green-500/10 text-green-500' :
                        booking.status === 'CHECKED_IN' ? 'bg-blue-500/10 text-blue-500' :
                        booking.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {booking.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operational Status Section */}
        <div className="space-y-6">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Room Status</CardTitle>
              <CardDescription>Current inventory overview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Available</span>
                  <span className="font-bold">{stats?.rooms.available ?? 0}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500" 
                    style={{ width: `${stats ? (stats.rooms.available / stats.rooms.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Occupied</span>
                  <span className="font-bold">{stats?.rooms.occupied ?? 0}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${stats ? (stats.rooms.occupied / stats.rooms.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Maintenance</span>
                  <span className="font-bold">{stats?.rooms.maintenance ?? 0}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-500" 
                    style={{ width: `${stats ? (stats.rooms.maintenance / stats.rooms.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary text-base">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Link href="/dashboard/hotel/bookings">
                <Button variant="ghost" className="w-full justify-start gap-2 h-10 hover:bg-primary/10">
                  <Clock className="w-4 h-4" /> Guest Check-in
                </Button>
              </Link>
              <Link href="/dashboard/hotel/settings">
                <Button variant="ghost" className="w-full justify-start gap-2 h-10 hover:bg-primary/10">
                  <ShieldCheck className="w-4 h-4" /> Update Policies
                </Button>
              </Link>
              <Link href="/dashboard/hotel/room-types">
                <Button variant="ghost" className="w-full justify-start gap-2 h-10 hover:bg-primary/10">
                  <TrendingUp className="w-4 h-4" /> Pricing & Availability
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}