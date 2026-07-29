'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export interface HotelTypeRecord { id: number; name: string }

export function HotelTypeFormDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: HotelTypeRecord | null
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setName(editing?.name ?? ''); setError(null) }
  }, [open, editing])

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const url = editing ? `/api/system-admin/hotel-types/${editing.id}` : '/api/system-admin/hotel-types'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), is_active: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.message || 'Something went wrong.'); return }
      onSaved()
      onOpenChange(false)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{editing ? 'Edit Hotel Type' : 'New Hotel Type'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="hotel-type-name">Name</Label>
            <Input id="hotel-type-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Resort" autoFocus />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Hotel Type'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}