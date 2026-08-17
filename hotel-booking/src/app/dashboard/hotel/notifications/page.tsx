'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function HotelAdminNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/hotel-admin/notifications', { credentials: 'include' })
    const data = await res.json()
    if (data.success) setNotifications(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const handleClick = async (n: any) => {
    if (!n.is_read) {
      await fetch(`/api/hotel-admin/notifications/${n.id}/read`, { method: 'PATCH', credentials: 'include' })
      fetchNotifications()
    }
    if (n.related_entity_type === 'MASTER_DATA_REQUEST') {
      router.push('/dashboard/hotel/master-data-requests')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Recent activity on your hotel.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notifications.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ListChecks className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium mt-3">No notifications yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                'w-full text-left rounded-xl border p-4 flex items-start gap-3 transition hover:bg-secondary/30',
                n.is_read ? 'border-border/60' : 'border-emerald-500/30 bg-emerald-500/5',
              )}
            >
              <div className={cn('p-2 rounded-lg shrink-0', n.is_read ? 'bg-secondary/60 text-muted-foreground' : 'bg-emerald-500/10 text-emerald-600')}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}