'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { Button } from '@/components/ui/button'
import { BedTypeFormDialog, type BedTypeRecord } from '@/components/admin/bed-types/bed-type-form-dialog'

interface BedTypeRow extends BedTypeRecord {
  usage_count?: number
}

export default function BedTypesPage() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<BedTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BedTypeRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/system-admin/bed-types?search=${encodeURIComponent(q)}&limit=100`, {
        credentials: 'include',
      })
      const data = await res.json()
      const list = data?.data?.bedTypes ?? data?.data?.items ?? []
      setRows(list)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/system-admin/bed-types?search=${encodeURIComponent(q)}&limit=100`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (!cancelled) {
          const list = data?.data?.bedTypes ?? data?.data?.items ?? []
          setRows(list)
        }
      } catch {
        if (!cancelled) {
          setRows([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [q])

  const handleDelete = async (row: BedTypeRecord) => {
    if (!confirm(`Delete "${row.name}"?`)) return

    try {
      const res = await fetch(`/api/system-admin/bed-types/${row.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(data.message || 'Unable to delete bed type.')
        return
      }
      load()
    } catch {
      alert('Failed to delete bed type.')
    }
  }

  return (
    <div className="mx-auto max-w-300 space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="Bed Types"
        description="Manage bed type options used across room setup forms."
        right={
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" /> New Bed Type
          </Button>
        }
      />

      <div className="flex items-center justify-end">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bed types…"
            className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-7 pr-2 text-xs outline-none focus:border-primary/60"
          />
        </div>
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh>Name</OpsTh>
            <OpsTh className="w-24" />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <OpsTd className="text-center text-muted-foreground" colSpan={2}>
                Loading…
              </OpsTd>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <OpsTd className="text-center text-muted-foreground" colSpan={2}>
                No bed types yet.
              </OpsTd>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="hover:bg-secondary/40">
                <OpsTd className="text-[13px]">{row.name}</OpsTd>
                <OpsTd className="text-right space-x-2">
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setEditing(row)
                      setDialogOpen(true)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => handleDelete(row)}
                  >
                    Delete
                  </button>
                </OpsTd>
              </tr>
            ))
          )}
        </tbody>
      </OpsTable>

      <BedTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={load}
      />
    </div>
  )
}