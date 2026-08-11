'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Minus, Plus, Info } from 'lucide-react'

type Facility = { id: number; name: string }
type BedType = { id: number; name: string }

export const RoomEditDialog = ({
  open, onOpenChange, roomId, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; roomId: number | null; onSaved: () => void }) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [bedTypes, setBedTypes] = useState<BedType[]>([])

  const [roomNumber, setRoomNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [notes, setNotes] = useState('')
  const [price, setPrice] = useState('')
  const [roomSize, setRoomSize] = useState('')
  const [maxOccupancy, setMaxOccupancy] = useState('')
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([])
  const [selectedBeds, setSelectedBeds] = useState<{ bed_type_id: number; count: number }[]>([])

  useEffect(() => {
    if (!open || !roomId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/hotel-admin/rooms/${roomId}`, { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/hotel-admin/room-facilities', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/hotel-admin/bed-types', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([roomRes, facRes, bedRes]) => {
      setFacilities(facRes?.data ?? [])
      setBedTypes(bedRes?.data ?? [])
      if (roomRes.success) {
        const room = roomRes.data
        setRoomNumber(room.room_number)
        setFloor(room.floor?.toString() ?? '')
        setNotes(room.notes ?? '')
        setPrice(String(room.room_variant.price))
        setRoomSize(room.room_variant.room_size ?? '')
        setMaxOccupancy(room.room_variant.max_occupancy?.toString() ?? '')
        setSelectedFacilities(room.room_variant.facilities.map((f: any) => f.facility.id))
        setSelectedBeds(room.room_variant.bed_types.map((b: any) => ({ bed_type_id: b.bed_type.id, count: b.count })))
      }
      setLoading(false)
    })
  }, [open, roomId])

  const toggleFacility = (id: number) => setSelectedFacilities((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleBed = (id: number) => setSelectedBeds((s) => (s.find((b) => b.bed_type_id === id) ? s.filter((b) => b.bed_type_id !== id) : [...s, { bed_type_id: id, count: 1 }]))
  const changeBedCount = (id: number, delta: number) => setSelectedBeds((s) => s.map((b) => (b.bed_type_id === id ? { ...b, count: Math.max(1, b.count + delta) } : b)))

  const submit = async () => {
    if (!roomId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/hotel-admin/rooms/${roomId}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: roomNumber, floor: floor ? Number(floor) : null, notes,
          price: Number(price), room_size: roomSize || null, max_occupancy: maxOccupancy ? Number(maxOccupancy) : null,
          facility_ids: selectedFacilities, bed_types: selectedBeds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({
          title: 'Room updated',
          description: data.data?.room_variant ? 'Its configuration was matched to the appropriate room variant.' : undefined,
        })
        onOpenChange(false)
        onSaved()
      } else {
        toast({ title: 'Could not update room', description: data.message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Room</DialogTitle>
          <DialogDescription>Live immediately — no approval needed.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Physical Room</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Room Number</Label>
                  <Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Floor</Label>
                  <Input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3 pt-1 border-t border-border">
              <div className="flex items-start gap-2 pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configuration</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 flex gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Changing these may move this room to a different (or newly created) configuration shared with other matching rooms.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Price / night</Label>
                  <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Max Occupancy</Label>
                  <Input type="number" value={maxOccupancy} onChange={(e) => setMaxOccupancy(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Room Size</Label>
                <Input value={roomSize} onChange={(e) => setRoomSize(e.target.value)} />
              </div>

              <div>
                <Label className="text-xs">Facilities</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {facilities.map((f) => {
                    const checked = selectedFacilities.includes(f.id)
                    return (
                      <button key={f.id} type="button" onClick={() => toggleFacility(f.id)}
                        className={cn('text-xs px-2.5 py-1.5 rounded-full border transition',
                          checked ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' : 'border-border bg-secondary/30 text-muted-foreground')}>
                        {f.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs">Bed Configuration</Label>
                <div className="space-y-1.5 mt-1">
                  {bedTypes.map((bt) => {
                    const sel = selectedBeds.find((b) => b.bed_type_id === bt.id)
                    return (
                      <div key={bt.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-1.5">
                        <button type="button" onClick={() => toggleBed(bt.id)} className={cn('text-xs', sel ? 'text-emerald-600 font-medium' : 'text-muted-foreground')}>{bt.name}</button>
                        {sel && (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => changeBedCount(bt.id, -1)} className="h-5 w-5 rounded-full border border-border flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                            <span className="text-xs w-4 text-center">{sel.count}</span>
                            <button type="button" onClick={() => changeBedCount(bt.id, 1)} className="h-5 w-5 rounded-full border border-border flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving || loading} onClick={submit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}