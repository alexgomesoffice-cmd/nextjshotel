'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const TABS = [
  { value: 'END_USER', label: 'All Users', path: 'end-user' },
  { value: 'HOTEL_ADMIN', label: 'Hotel Admin', path: 'hotel-admin' },
  { value: 'HOTEL_SUB_ADMIN', label: 'Hotel Sub Admin', path: 'hotel-sub-admin' },
] as const

interface Row {
  id: number
  name: string
  email: string
  is_active: boolean
  is_blocked: boolean
  last_login_at: string | null
  hotel?: { id: number; name: string } | null
}

export default function UsersPage() {
  const router = useRouter()
  const [type, setType] = useState<(typeof TABS)[number]['value']>('END_USER')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/system-admin/users?type=${type}&search=${encodeURIComponent(q)}&limit=100`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setRows(d?.data?.users ?? []))
      .finally(() => setLoading(false))
  }, [type, q])

  useEffect(() => { load() }, [load])

  const activeTab = TABS.find((t) => t.value === type)!
  const showHotelCol = type !== 'END_USER'

  const toggleBlock = async (row: Row, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await fetch(`/api/system-admin/users/${activeTab.path}/${row.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_blocked: !row.is_blocked }),
    })
    const data = await res.json()
    if (data.success) load()
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader title="Users" description="Everyone with an account on the platform." />

      <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
        <TabsList variant="line">
          {TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="relative max-w-md">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…"
          className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-7 pr-2 text-xs outline-none focus:border-primary/60"
        />
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh>Name</OpsTh>
            <OpsTh>Email</OpsTh>
            {showHotelCol && <OpsTh>Hotel</OpsTh>}
            <OpsTh className="w-32">Last Login</OpsTh>
            <OpsTh className="w-24">Status</OpsTh>
            <OpsTh className="w-20"></OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={6}>Loading…</OpsTd></tr>
          ) : rows.length === 0 ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={6}>No users found.</OpsTd></tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-secondary/40"
                onClick={() => router.push(`/dashboard/system/users/${activeTab.path}/${r.id}`)}
              >
                <OpsTd className="text-[13px]">{r.name}</OpsTd>
                <OpsTd className="text-xs text-muted-foreground">{r.email}</OpsTd>
                {showHotelCol && <OpsTd className="text-xs text-muted-foreground">{r.hotel?.name ?? '—'}</OpsTd>}
                <OpsTd className="text-xs text-muted-foreground">
                  {r.last_login_at ? new Date(r.last_login_at).toLocaleDateString() : 'Never'}
                </OpsTd>
                <OpsTd>
                  <span className={cn('inline-flex items-center gap-1.5 text-xs', r.is_blocked ? 'text-red-500' : r.is_active ? 'text-emerald-600' : 'text-muted-foreground')}>
                    <span className={cn('h-2 w-2 rounded-full', r.is_blocked ? 'bg-red-500' : r.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                    {r.is_blocked ? 'Blocked' : r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </OpsTd>
                <OpsTd className="text-right">
                  <button className="text-xs text-primary hover:underline" onClick={(e) => toggleBlock(r, e)}>
                    {r.is_blocked ? 'Unblock' : 'Block'}
                  </button>
                </OpsTd>
              </tr>
            ))
          )}
        </tbody>
      </OpsTable>
    </div>
  )
}