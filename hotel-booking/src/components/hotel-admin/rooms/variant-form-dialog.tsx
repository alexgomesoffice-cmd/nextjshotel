'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Minus, Plus, Info } from 'lucide-react'

type Facility = { id: number; name: string }
type BedType = { id: number; name: string }

export const VariantFormDialog = ({
  open, onOpenChange, variant, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; variant: any; onSaved: () => void }) => {
  const { toast } = useToast()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [bedTypes, setBedTypes] = useState<BedType[]>([])
  const [price, setPrice] = useState('')
  const [roomSize, setRoomSize] = useState('')
  const [maxOccupancy, setMaxOccupancy] = useState('')
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([])
  const [selectedBeds, setSelectedBeds] = useState<{ bed_type_id: number; count: number }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !variant) return
    Promise.all([
      fetch('/api/hotel-admin/room-facilities', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/hotel-admin/bed-types', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([f, b]) => {
      setFacilities(f?.data ?? [])
      setBedTypes(b?.data ?? [])
    })
    setPrice(String(variant.price))
    setRoomSize(variant.room_size ?? '')
    setMaxOccupancy(variant.max_occupancy?.toString() ?? '')
    setSelectedFacilities(variant.facilities.map((f: any) => f.facility.id))
    setSelectedBeds(variant.bed_types.map((b: any) => ({ bed_type_id: b.bed_type.id, count: b.count })))
  }, [open, variant])

  const toggleFacility = (id: number) => setSelectedFacilities((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleBed = (id: number) => setSelectedBeds((s) => (s.find((b) => b.bed_type_id === id) ? s.filter((b) => b.bed_type_id !== id) : [...s, { bed_type_id: id, count: 1 }]))
  const changeBedCount = (id: number, delta: number) => setSelectedBeds((s) => s.map((b) => (b.bed_type_id === id ? { ...b, count: Math.max(1, b.count + delta) } : b)))

  const submit = async () => {
    if (!variant || !price.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/hotel-admin/room-variants/${variant.id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: Number(price), room_size: roomSize || null, max_occupancy: maxOccupancy ? Number(maxOccupancy) : null,
          facility_ids: selectedFacilities, bed_types: selectedBeds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: data.message })
        onOpenChange(false)
        onSaved()
      } else {
        toast({ title: 'Could not save', description: data.message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (!variant) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Configuration</DialogTitle>
          <DialogDescription>Live immediately — affects every room in this configuration.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 flex gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Changing these values affects all {variant.room_details.length} room{variant.room_details.length === 1 ? '' : 's'} here. If the new configuration matches a different existing one, these rooms will move there instead.
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
            <Input value={roomSize} onChange={(e) => setRoomSize(e.target.value)} placeholder="e.g. 320 sqft" />
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving || !price.trim()} onClick={submit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}