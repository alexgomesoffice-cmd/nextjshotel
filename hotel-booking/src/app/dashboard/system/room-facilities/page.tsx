'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Wrench } from 'lucide-react'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { Button } from '@/components/ui/button'
import { RoomFacilityFormDialog, RoomFacilityRecord } from '@/components/admin/room-facilities/room-facility-form-dialog'

export default function RoomFacilitiesPage() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<(RoomFacilityRecord & { usage_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RoomFacilityRecord | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/system-admin/room-facilities?search=${encodeURIComponent(q)}&limit=100`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setRows(data?.data?.roomFacilities ?? []))
      .finally(() => setLoading(false))
  }, [q])

  useEffect(() => { load() }, [load])

  const handleDelete = async (row: RoomFacilityRecord) => {
    if (!confirm(`Delete "${row.name}"?`)) return
    const res = await fetch(`/api/system-admin/room-facilities/${row.id}`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json()
    alert(data.message)
    load()
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="Room Facilities"
        description="Structural room properties — AC, smoking, pets, etc. — selectable per physical room."
        right={
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="h-3.5 w-3.5" /> New Room Facility
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search room facilities…"
          className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-7 pr-2 text-xs outline-none focus:border-primary/60"
        />
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh className="w-10"></OpsTh>
            <OpsTh>Name</OpsTh>
            <OpsTh className="w-32 text-right">Usage</OpsTh>
            <OpsTh className="w-24"></OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={4}>Loading…</OpsTd></tr>
          ) : rows.length === 0 ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={4}>No room facilities yet.</OpsTd></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/40">
                <OpsTd><Wrench className="h-4 w-4 text-muted-foreground" /></OpsTd>
                <OpsTd className="text-[13px]">{r.name}</OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums">{r.usage_count}</OpsTd>
                <OpsTd className="text-right space-x-2">
                  <button className="text-xs text-primary hover:underline" onClick={() => { setEditing(r); setDialogOpen(true) }}>Edit</button>
                  <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(r)}>Delete</button>
                </OpsTd>
              </tr>
            ))
          )}
        </tbody>
      </OpsTable>

      <RoomFacilityFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={load} />
    </div>
  )
}