'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const CATEGORY_META: Record<string, { title: string; placeholder: string; needsContext?: boolean }> = {
  AMENITY: { title: 'Amenity', placeholder: 'e.g. Mini Fridge', needsContext: true },
  BED_TYPE: { title: 'Bed Type', placeholder: 'e.g. Rollaway Bed' },
  ROOM_FACILITY: { title: 'Room Facility', placeholder: 'e.g. Blackout Curtains' },
}

export const RequestDialog = ({
  open, onOpenChange, category, onSubmitted,
}: { open: boolean; onOpenChange: (v: boolean) => void; category: 'AMENITY' | 'BED_TYPE' | 'ROOM_FACILITY' | null; onSubmitted: () => void }) => {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [context, setContext] = useState<'HOTEL' | 'ROOM'>('HOTEL')
  const [saving, setSaving] = useState(false)

  if (!category) return null
  const meta = CATEGORY_META[category]

  const reset = () => { setName(''); setNote(''); setContext('HOTEL') }

  const submit = async () => {
    if (!name.trim() || !note.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/hotel-admin/master-data-requests', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, name, note, context: meta.needsContext ? context : undefined }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Request submitted', description: 'System Admin will review it.' })
        reset()
        onOpenChange(false)
        onSubmitted()
      } else {
        toast({ title: 'Could not submit', description: data.message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Request New {meta.title}</DialogTitle>
          <DialogDescription>A System Admin will manually review and create global master data when appropriate.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={meta.placeholder} />
          </div>
          {meta.needsContext && (
            <div>
              <Label className="text-xs">Type</Label>
              <div className="flex gap-2 mt-1">
                {(['HOTEL', 'ROOM'] as const).map((c) => (
                  <button
                    key={c} type="button" onClick={() => setContext(c)}
                    className={cn('flex-1 text-xs py-2 rounded-lg border transition',
                      context === c ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600' : 'border-border text-muted-foreground')}
                  >
                    {c === 'HOTEL' ? 'Hotel Amenity' : 'Room Amenity'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Why do you need it?</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain why this is needed…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving || !name.trim() || !note.trim()} onClick={submit}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}