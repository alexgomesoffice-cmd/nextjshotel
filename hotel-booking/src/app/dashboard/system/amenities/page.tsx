'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search } from 'lucide-react'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AmenityFormDialog, AmenityIcon, AmenityRecord } from '@/components/admin/amenities/amenity-form-dialog'

export default function AmenitiesPage() {
  const [context, setContext] = useState<'HOTEL' | 'ROOM'>('HOTEL')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<(AmenityRecord & { usage_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AmenityRecord | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/system-admin/amenities?context=${context}&search=${encodeURIComponent(q)}&limit=100`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => setRows(data?.data?.amenities ?? []))
      .finally(() => setLoading(false))
  }, [context, q])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (row: AmenityRecord) => {
    if (!confirm(`Delete "${row.name}"?`)) return
    const res = await fetch(`/api/system-admin/amenities/${row.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    alert(data.message)
    load()
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="Amenities"
        description="Master list synced to hotel and room type forms."
        right={
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" /> New Amenity
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-3">
        <Tabs value={context} onValueChange={(v) => setContext(v as 'HOTEL' | 'ROOM')}>
          <TabsList variant="line">
            <TabsTrigger
              value="HOTEL"
            >
              Hotel
            </TabsTrigger>
            <TabsTrigger
              value="ROOM"
            >
              Room Type
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search amenities…"
            className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-7 pr-2 text-xs outline-none focus:border-primary/60"
          />
        </div>
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh>Name</OpsTh>
            <OpsTh className="w-24">Icon</OpsTh>
            <OpsTh className="w-32 text-right">Usage</OpsTh>
            <OpsTh className="w-24"></OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={4}>Loading…</OpsTd></tr>
          ) : rows.length === 0 ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={4}>No amenities yet.</OpsTd></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/40">
                <OpsTd className="text-[13px]">{r.name}</OpsTd>
                <OpsTd><AmenityIcon name={r.icon} className="h-4 w-4 text-muted-foreground" /></OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums">{r.usage_count}</OpsTd>
                <OpsTd className="text-right space-x-2">
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => { setEditing(r); setDialogOpen(true) }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => handleDelete(r)}
                  >
                    Delete
                  </button>
                </OpsTd>
              </tr>
            ))
          )}
        </tbody>
      </OpsTable>

      <AmenityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        context={context}
        editing={editing}
        onSaved={load}
      />
    </div>
  )
}