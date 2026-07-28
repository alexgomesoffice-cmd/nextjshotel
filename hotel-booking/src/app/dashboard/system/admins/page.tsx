'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Plus, User } from 'lucide-react'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { Button } from '@/components/ui/button'
import { AdminFormDialog } from '@/components/admin/admins/admin-form-dialog'
import { cn } from '@/lib/utils'

interface AdminRow {
  id: number
  name: string
  email: string
  is_active: boolean
  is_blocked: boolean
  phone: string | null
  image_url: string | null
  last_login_at: string | null
  created_by: string | null
}

export default function SystemAdminsPage() {
  const [rows, setRows] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/system-admin/admins', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setRows(data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="System Admins"
        description="Flat access — any admin can create another with identical abilities."
        right={
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New System Admin
          </Button>
        }
      />

      <OpsTable>
        <thead>
          <tr>
            <OpsTh className="w-10"></OpsTh>
            <OpsTh>Name</OpsTh>
            <OpsTh>Email</OpsTh>
            <OpsTh>Phone</OpsTh>
            <OpsTh className="w-24">Status</OpsTh>
            <OpsTh>Created By</OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={6}>Loading…</OpsTd></tr>
          ) : rows.length === 0 ? (
            <tr><OpsTd className="text-center text-muted-foreground" colSpan={6}>No system admins yet.</OpsTd></tr>
          ) : (
            rows.map((r) => {
              const active = r.is_active && !r.is_blocked
              return (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <OpsTd>
                    {r.image_url ? (
                      <div className="relative h-7 w-7 overflow-hidden rounded-full">
                        <Image src={r.image_url} alt={r.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-secondary/60">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </OpsTd>
                  <OpsTd className="text-[13px]">{r.name}</OpsTd>
                  <OpsTd className="text-xs text-muted-foreground">{r.email}</OpsTd>
                  <OpsTd className="text-xs text-muted-foreground">{r.phone ?? '—'}</OpsTd>
                  <OpsTd>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          active ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                        )}
                      />
                      {r.is_blocked ? 'Blocked' : active ? 'Active' : 'Inactive'}
                    </span>
                  </OpsTd>
                  <OpsTd className="text-xs text-muted-foreground">{r.created_by ?? '—'}</OpsTd>
                </tr>
              )
            })
          )}
        </tbody>
      </OpsTable>

      <AdminFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} />
    </div>
  )
}