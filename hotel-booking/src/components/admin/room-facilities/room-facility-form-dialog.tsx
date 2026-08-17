'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export interface RoomFacilityRecord { id: number; name: string }

export function RoomFacilityFormDialog({
  open, onOpenChange, editing, prefillName, fulfillsRequestId, onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: RoomFacilityRecord | null
  prefillName?: string
  fulfillsRequestId?: number
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setName(editing?.name ?? prefillName ?? ''); setError(null) }
  }, [open, editing, prefillName])

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const url = editing ? `/api/system-admin/room-facilities/${editing.id}` : '/api/system-admin/room-facilities'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), is_active: true,
          ...(!editing && fulfillsRequestId ? { fulfills_request_id: fulfillsRequestId } : {}),
        }),
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
        <DialogHeader><DialogTitle>{editing ? 'Edit Room Facility' : 'New Room Facility'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="facility-name">Name</Label>
            <Input id="facility-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Air Conditioning" autoFocus />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Room Facility'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}