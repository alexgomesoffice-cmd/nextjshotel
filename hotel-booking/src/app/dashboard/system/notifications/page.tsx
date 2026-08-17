'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { OpsSectionHeader } from '@/components/admin/shared/primitives'
import { Bell, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SystemAdminNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/system-admin/notifications', { credentials: 'include' })
    const data = await res.json()
    if (data.success) setNotifications(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const handleClick = async (n: any) => {
    if (!n.is_read) {
      await fetch(`/api/system-admin/notifications/${n.id}/read`, { method: 'PATCH', credentials: 'include' })
      fetchNotifications()
    }
    if (n.related_entity_type === 'MASTER_DATA_REQUEST' && n.related_entity_id) {
      router.push(`/dashboard/system/master-data-requests/${n.related_entity_id}`)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader title="Notifications" description="Recent activity that needs your attention." />

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
                n.is_read ? 'border-border/60' : 'border-blue-500/30 bg-blue-500/5',
              )}
            >
              <div className={cn('p-2 rounded-lg shrink-0', n.is_read ? 'bg-secondary/60 text-muted-foreground' : 'bg-blue-500/10 text-blue-500')}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}