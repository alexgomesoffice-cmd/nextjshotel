// filepath: src/app/dashboard/system/page.tsx
// System Admin Overview Dashboard
// Shows: Total hotels, active hotels, total users, total bookings, revenue stats

'use client'
import { useToast } from '@/hooks/use-hooks'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2, Users, Calendar, DollarSign, TrendingUp,
  Hotel, UserCheck, BookOpen,
} from 'lucide-react'

interface OverviewStats {
  totalHotels: number
  publishedHotels: number
  totalUsers: number
  totalBookings: number
  monthlyRevenue: number
  totalRevenue: number
  averageOccupancy: number
  pendingApprovals: number
}

interface RecentActivity {
  id: number
  type: 'hotel' | 'user' | 'booking'
  message: string
  timestamp: string
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  loading,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: { value: number; isPositive: boolean }
  loading?: boolean
}) => (
  <Card className="glass-strong">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <p className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}% from last month
            </p>
          )}
        </>
      )}
    </CardContent>
  </Card>
)

export default function SystemAdminPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        // TODO: Create GET /api/system-admin/overview endpoint
        // For now, using mock data for UI development
        const mockStats: OverviewStats = {
          totalHotels: 24,
          publishedHotels: 18,
          totalUsers: 1250,
          totalBookings: 542,
          monthlyRevenue: 125000,
          totalRevenue: 850000,
          averageOccupancy: 73.5,
          pendingApprovals: 3,
        }
        const mockActivity: RecentActivity[] = [
          {
            id: 1,
            type: 'hotel',
            message: 'Grand Palace Hotel registered',
            timestamp: '2 hours ago',
          },
          {
            id: 2,
            type: 'user',
            message: '5 new users signed up',
            timestamp: '4 hours ago',
          },
          {
            id: 3,
            type: 'booking',
            message: 'Booking #HBD-20250502-XXXX confirmed',
            timestamp: '6 hours ago',
          },
        ]
        setStats(mockStats)
        setRecentActivity(mockActivity)
      } catch (error) {
        console.error('Failed to fetch overview stats:', error)
        toast({
          title: 'Error',
          description: 'Failed to load dashboard stats',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [toast])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">System Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's your platform overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Hotels"
          value={stats?.totalHotels ?? 0}
          icon={Building2}
          loading={loading}
        />
        <StatCard
          title="Published Hotels"
          value={stats?.publishedHotels ?? 0}
          icon={Hotel}
          loading={loading}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          loading={loading}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          icon={Calendar}
          loading={loading}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="Monthly Revenue"
          value={stats ? `৳${stats.monthlyRevenue.toLocaleString()}` : 0}
          icon={DollarSign}
          loading={loading}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Total Revenue"
          value={stats ? `৳${stats.totalRevenue.toLocaleString()}` : 0}
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="Avg. Occupancy"
          value={stats ? `${stats.averageOccupancy}%` : 0}
          icon={UserCheck}
          loading={loading}
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.pendingApprovals ?? 0}
          icon={BookOpen}
          loading={loading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="glass-strong lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              ) : (
                recentActivity.map((activity) => {
                  const iconMap = {
                    hotel: <Building2 className="h-4 w-4 text-blue-500" />,
                    user: <Users className="h-4 w-4 text-green-500" />,
                    booking: <Calendar className="h-4 w-4 text-purple-500" />,
                  }
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-b-0"
                    >
                      <div className="mt-1">{iconMap[activity.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.timestamp}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/dashboard/system/hotels/new"
              className="block px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-colors"
            >
              + Create Hotel
            </a>
            <a
              href="/dashboard/system/admins/new"
              className="block px-4 py-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 font-medium text-sm transition-colors"
            >
              + Create System Admin
            </a>
            <a
              href="/dashboard/system/cities"
              className="block px-4 py-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-medium text-sm transition-colors"
            >
              Manage Cities
            </a>
            <a
              href="/dashboard/system/hotel-types"
              className="block px-4 py-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 font-medium text-sm transition-colors"
            >
              Manage Hotel Types
            </a>
            <a
              href="/dashboard/system/amenities"
              className="block px-4 py-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-medium text-sm transition-colors"
            >
              Manage Amenities
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle>Platform Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Hotel Approval Rate</span>
                <span className="text-lg font-bold">
                  {stats
                    ? `${Math.round((stats.publishedHotels / stats.totalHotels) * 100)}%`
                    : 0}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-linear-to-r from-primary to-accent h-2 rounded-full"
                  style={{
                    width: `${stats ? (stats.publishedHotels / stats.totalHotels) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">System Health</span>
                <span className="text-lg font-bold">98%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-linear-to-r from-green-500 to-emerald-500 h-2 rounded-full w-[98%]" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">User Satisfaction</span>
                <span className="text-lg font-bold">4.7/5</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-linear-to-r from-yellow-500 to-amber-500 h-2 rounded-full w-[94%]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}