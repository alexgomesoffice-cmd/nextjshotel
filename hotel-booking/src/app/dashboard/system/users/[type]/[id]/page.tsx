'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { OpsSectionHeader } from '@/components/admin/shared/primitives'
import { EditableSection } from '@/components/admin/hotels/editable-section'
import { Button } from '@/components/ui/button'

const TYPE_LABEL: Record<string, string> = {
  'end-user': 'User', 'hotel-admin': 'Hotel Admin', 'hotel-sub-admin': 'Hotel Sub Admin',
}

export default function UserDetailPage() {
  const params = useParams<{ type: string; id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch(`/api/system-admin/users/${params.type}/${params.id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setUser(d?.data ?? null))
      .finally(() => setLoading(false))
  }, [params.type, params.id])

  useEffect(() => { load() }, [load])

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/system-admin/users/${params.type}/${params.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) load()
    return data
  }

  const toggleBlock = () => patch({ is_blocked: !user.is_blocked })

  if (loading) return <div className="px-6 py-5 text-sm text-muted-foreground">Loading…</div>
  if (!user) return <div className="px-6 py-5 text-sm text-muted-foreground">User not found.</div>

  const emailLocked = params.type === 'hotel-admin'

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-6 py-5">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-sm p-1.5 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <OpsSectionHeader
          title={user.name}
          description={`${TYPE_LABEL[params.type] ?? params.type}${user.hotel ? ` · ${user.hotel.name}` : ''}`}
          right={
            <Button size="sm" variant={user.is_blocked ? 'default' : 'destructive'} className="h-8 text-xs" onClick={toggleBlock}>
              {user.is_blocked ? 'Unblock' : 'Block'}
            </Button>
          }
        />
      </div>

      <EditableSection
        title="Identity"
        fields={[
          { key: 'name', label: 'Name', value: user.name },
          { key: 'email', label: emailLocked ? 'Email (locked)' : 'Email', value: user.email, type: 'email', editable: !emailLocked },
          { key: 'phone', label: 'Phone', value: user.detail?.phone ?? null },
          { key: 'address', label: 'Address', value: user.detail?.address ?? null },
        ]}
        onSave={patch}
      />

      <div className="rounded-md border border-border/60 p-4 text-sm">
        <div className="flex justify-between border-b border-border/40 py-1.5">
          <span className="text-muted-foreground">Status</span>
          <span>{user.is_blocked ? 'Blocked' : user.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-muted-foreground">Last Login</span>
          <span>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</span>
        </div>
      </div>
    </div>
  )
}