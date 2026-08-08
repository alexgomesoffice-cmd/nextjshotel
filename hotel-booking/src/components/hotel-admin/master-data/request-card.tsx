'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Plus, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

type Req = {
  id: number
  name: string
  note: string
  context: 'HOTEL' | 'ROOM' | null
  status: 'PENDING' | 'FULFILLED' | 'DISMISSED'
  created_entity_id: number | null
  created_at: string
}

const STATUS_BADGE: Record<string, { label: string; tone: string; icon: any }> = {
  PENDING: { label: 'Pending', tone: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
  FULFILLED: { label: 'Created', tone: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
  DISMISSED: { label: 'Dismissed', tone: 'bg-muted text-muted-foreground border-border', icon: XCircle },
}

export const RequestCard = ({
  title, description, icon: Icon, accent, category, requests, needsContext, onSubmitted,
}: {
  title: string
  description: string
  icon: any
  accent: string
  category: 'AMENITY' | 'BED_TYPE' | 'ROOM_FACILITY'
  requests: Req[]
  needsContext?: boolean
  onSubmitted: () => void
}) => {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [context, setContext] = useState<'HOTEL' | 'ROOM'>('HOTEL')
  const [saving, setSaving] = useState(false)

  const pending = requests.filter((r) => r.status === 'PENDING')
  const historyList = requests.filter((r) => r.status !== 'PENDING')
  const visible = showHistory ? requests : pending

  const submit = async () => {
    if (!name.trim() || !note.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/hotel-admin/master-data-requests', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, name, note, context: needsContext ? context : undefined }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Request submitted', description: 'System Admin will review it.' })
        setOpen(false); setName(''); setNote(''); setContext('HOTEL')
        onSubmitted()
      } else {
        toast({ title: 'Could not submit', description: data.message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="border-b border-border/50 flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn('p-2 rounded-xl bg-gradient-to-br shrink-0', accent)}>
            <Icon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Request
        </Button>
      </CardHeader>
      <CardContent className="p-4 flex-1 space-y-2">
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {showHistory ? 'No requests yet.' : 'No pending requests.'}
          </p>
        )}
        {visible.map((r) => {
          const badge = STATUS_BADGE[r.status]
          return (
            <div key={r.id} className="rounded-lg border border-border/60 p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{r.name}</p>
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0', badge.tone)}>
                  <badge.icon className="h-2.5 w-2.5" />
                  {r.status === 'FULFILLED' ? `Created: ${r.name}` : badge.label}
                </span>
              </div>
              {r.context && <p className="text-[10px] text-muted-foreground uppercase">{r.context === 'HOTEL' ? 'Hotel Amenity' : 'Room Amenity'}</p>}
              <p className="text-xs text-muted-foreground line-clamp-2">{r.note}</p>
            </div>
          )
        })}
        {historyList.length > 0 && (
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 pt-2"
          >
            {showHistory ? <>Hide history <ChevronUp className="h-3 w-3" /></> : <>View history ({historyList.length}) <ChevronDown className="h-3 w-3" /></>}
          </button>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Request New {title.replace(/s$/, '')}</DialogTitle>
            <DialogDescription>System Admin will create this manually if approved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rollaway Bed" />
            </div>
            {needsContext && (
              <div>
                <Label className="text-xs">Context</Label>
                <div className="flex gap-2 mt-1">
                  {(['HOTEL', 'ROOM'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setContext(c)}
                      className={cn(
                        'flex-1 text-xs py-2 rounded-lg border transition',
                        context === c ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600' : 'border-border text-muted-foreground',
                      )}
                    >
                      {c === 'HOTEL' ? 'Hotel Amenity' : 'Room Amenity'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">Note</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you need this…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={saving || !name.trim() || !note.trim()} onClick={submit}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}