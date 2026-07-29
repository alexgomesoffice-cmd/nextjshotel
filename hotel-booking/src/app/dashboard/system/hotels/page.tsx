'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HotelRow {
  id: number
  name: string
  city: { name: string } | null
  owner: string | null
  hotelAdmin: { name: string } | null
  hasPendingCase: boolean
  bookings30d: number
  revenue30d: number
  approval_status: 'UNPUBLISHED' | 'PUBLISHED' | 'SUSPENDED'
}

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-600',
  UNPUBLISHED: 'bg-muted-foreground/15 text-muted-foreground',
  SUSPENDED: 'bg-red-500/15 text-red-600',
}

export default function HotelsPage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<HotelRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/system-admin/hotels?search=${encodeURIComponent(q)}&limit=100`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setRows(data?.data?.hotels ?? []))
      .finally(() => setLoading(false))
  }, [q])

  useEffect(() => { load() }, [load])

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="Hotels"
        description="Every property on the platform."
        right={
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => router.push('/dashboard/system/hotels/new')}>
            <Plus className="h-3.5 w-3.5" /> Add Hotel
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hotels…"
          className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-7 pr-2 text-xs outline-none focus:border-primary/60"
        />
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh>Hotel</OpsTh>
            <OpsTh className="w-32">City</OpsTh>
            <OpsTh className="w-40">Owner</OpsTh>
            <OpsTh className="w-40">Hotel Admin</OpsTh>
            <OpsTh className="w-28">Pending Cases</OpsTh>
            <OpsTh className="w-24 text-right">Bookings 30d</OpsTh>
            <OpsTh className="w-32 text-right">Revenue 30d</OpsTh>
            <OpsTh className="w-28">Status</OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={8}>Loading…</OpsTd></tr>
          ) : rows.length === 0 ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={8}>No hotels yet.</OpsTd></tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-secondary/40"
                onClick={() => router.push(`/dashboard/system/hotels/${r.id}`)}
              >
                <OpsTd className="text-[13px] font-medium">{r.name}</OpsTd>
                <OpsTd className="text-xs text-muted-foreground">{r.city?.name ?? '—'}</OpsTd>
                <OpsTd className="text-xs text-muted-foreground">{r.owner ?? '—'}</OpsTd>
                <OpsTd className="text-xs text-muted-foreground">{r.hotelAdmin?.name ?? '—'}</OpsTd>
                <OpsTd className="text-xs">{r.hasPendingCase ? 'Yes' : 'No'}</OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums">{r.bookings30d}</OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums">${r.revenue30d.toFixed(2)}</OpsTd>
                <OpsTd>
                  <span className={cn('rounded-sm px-1.5 py-0.5 text-[11px] font-medium', STATUS_STYLE[r.approval_status])}>
                    {r.approval_status}
                  </span>
                </OpsTd>
              </tr>
            ))
          )}
        </tbody>
      </OpsTable>
    </div>
  )
}