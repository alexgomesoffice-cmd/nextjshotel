'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Upload, X, Plus, Minus, CheckCircle2, Sparkles } from 'lucide-react'
import { parseRoomNumberInput } from '@/lib/room-number-parser'

type Facility = { id: number; name: string }
type BedType = { id: number; name: string }
type BedSelection = { bed_type_id: number; count: number }

// Honest, client-side check against already-fetched variants of this room
// type — same fields the backend's signature uses. Never fabricated: if the
// data isn't loaded, this simply returns null and the UI falls back to
// explanatory text instead of a fake promise.
function findMatchingVariant(variants: any[], config: { price: string; roomSize: string; maxOccupancy: string; facilityIds: number[]; beds: BedSelection[] }) {
  if (!variants || variants.length === 0) return null
  const price = Number(config.price || 0).toFixed(2)
  const size = (config.roomSize || '').trim().toLowerCase() || null
  const occ = config.maxOccupancy ? Number(config.maxOccupancy) : null
  const facilities = [...new Set(config.facilityIds)].sort((a, b) => a - b)
  const beds = [...config.beds].map((b) => ({ bed_type_id: b.bed_type_id, count: b.count })).sort((a, b) => a.bed_type_id - b.bed_type_id)

  return variants.find((v) => {
    const vPrice = Number(v.price).toFixed(2)
    const vSize = (v.room_size ?? '').trim().toLowerCase() || null
    const vOcc = v.max_occupancy ?? null
    const vFacilities = [...v.facilities.map((f: any) => f.facility.id)].sort((a, b) => a - b)
    const vBeds = [...v.bed_types.map((b: any) => ({ bed_type_id: b.bed_type.id, count: b.count }))].sort((a, b) => a.bed_type_id - b.bed_type_id)

    return vPrice === price && vSize === size && vOcc === occ
      && JSON.stringify(vFacilities) === JSON.stringify(facilities)
      && JSON.stringify(vBeds) === JSON.stringify(beds)
  }) ?? null
}

export const RoomFormDialog = ({
  open, onOpenChange, roomTypeId, existingVariants, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; roomTypeId: number | null; existingVariants?: any[]; onCreated: () => void }) => {
  const { toast } = useToast()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [bedTypes, setBedTypes] = useState<BedType[]>([])
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  const [roomNumber, setRoomNumber] = useState('')
  const [roomNumbers, setRoomNumbers] = useState('')
  const [floor, setFloor] = useState('')
  const [notes, setNotes] = useState('')
  const [price, setPrice] = useState('')
  const [roomSize, setRoomSize] = useState('')
  const [maxOccupancy, setMaxOccupancy] = useState('')
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([])
  const [selectedBeds, setSelectedBeds] = useState<BedSelection[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/hotel-admin/room-facilities', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/hotel-admin/bed-types', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([f, b]) => {
      setFacilities(f?.data ?? [])
      setBedTypes(b?.data ?? [])
    })
  }, [open])

  const reset = () => {
    setMode('single'); setRoomNumber(''); setRoomNumbers(''); setFloor(''); setNotes('')
    setPrice(''); setRoomSize(''); setMaxOccupancy(''); setSelectedFacilities([]); setSelectedBeds([]); setFiles([])
  }

  const toggleFacility = (id: number) => setSelectedFacilities((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleBed = (id: number) => setSelectedBeds((s) => (s.find((b) => b.bed_type_id === id) ? s.filter((b) => b.bed_type_id !== id) : [...s, { bed_type_id: id, count: 1 }]))
  const changeBedCount = (id: number, delta: number) => setSelectedBeds((s) => s.map((b) => (b.bed_type_id === id ? { ...b, count: Math.max(1, b.count + delta) } : b)))

  const bulkPreview = useMemo(() => {
    if (mode !== 'bulk' || !roomNumbers.trim()) return null
    return parseRoomNumberInput(roomNumbers)
  }, [mode, roomNumbers])

  const matchedVariant = useMemo(() => {
    if (!price.trim() || !existingVariants) return null
    return findMatchingVariant(existingVariants, { price, roomSize, maxOccupancy, facilityIds: selectedFacilities, beds: selectedBeds })
  }, [price, roomSize, maxOccupancy, selectedFacilities, selectedBeds, existingVariants])

  const submit = async () => {
    if (!roomTypeId) return
    if (mode === 'single' && !roomNumber.trim()) return
    if (mode === 'bulk' && (!roomNumbers.trim() || bulkPreview?.error)) return
    if (!price.trim()) return

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('room_type_id', String(roomTypeId))
      fd.append('price', price)
      if (roomSize) fd.append('room_size', roomSize)
      if (maxOccupancy) fd.append('max_occupancy', maxOccupancy)
      if (floor) fd.append('floor', floor)
      if (notes) fd.append('notes', notes)
      fd.append('facility_ids', JSON.stringify(selectedFacilities))
      fd.append('bed_types', JSON.stringify(selectedBeds))
      files.forEach((f) => fd.append('files', f))

      if (mode === 'bulk') {
        fd.append('bulk', 'true')
        fd.append('room_numbers', roomNumbers)
      } else {
        fd.append('room_number', roomNumber)
      }

      const res = await fetch('/api/hotel-admin/rooms', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (data.success) {
        toast({
          title: data.message,
          description: data.data?.matched_existing_variant ? 'Joined an existing configuration.' : 'A new configuration was created.',
        })
        reset()
        onOpenChange(false)
        onCreated()
      } else {
        toast({ title: 'Could not create room', description: data.message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Room</DialogTitle>
          <DialogDescription>Live immediately — no approval needed. Rooms with identical configuration automatically share the same room variant.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Information */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</p>
            <div className="flex gap-2">
              {(['single', 'bulk'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={cn('flex-1 text-sm py-2 rounded-lg border transition',
                    mode === m ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600' : 'border-border text-muted-foreground')}>
                  {m === 'single' ? 'Single Room' : 'Multiple Rooms'}
                </button>
              ))}
            </div>

            {mode === 'single' ? (
              <div>
                <Label className="text-xs">Room Number</Label>
                <Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. 301" />
              </div>
            ) : (
              <div>
                <Label className="text-xs">Room Numbers</Label>
                <Input value={roomNumbers} onChange={(e) => setRoomNumbers(e.target.value)} placeholder="e.g. 301-305 or 301,302,305" />
                {bulkPreview?.error && <p className="text-[11px] text-destructive mt-1">{bulkPreview.error}</p>}
                {bulkPreview && !bulkPreview.error && (
                  <div className="mt-2 rounded-lg border border-border bg-secondary/30 p-2.5">
                    <p className="text-[11px] font-medium mb-1">{bulkPreview.roomNumbers.length} room{bulkPreview.roomNumbers.length === 1 ? '' : 's'} will be created</p>
                    <div className="flex flex-wrap gap-1">
                      {bulkPreview.roomNumbers.slice(0, 30).map((n) => <span key={n} className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border">{n}</span>)}
                      {bulkPreview.roomNumbers.length > 30 && <span className="text-[10px] text-muted-foreground">+{bulkPreview.roomNumbers.length - 30} more</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <Label className="text-xs">Floor</Label>
              <Input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Room Configuration */}
          <div className="space-y-3 pt-1 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3">Room Configuration</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Room Size</Label>
                <Input value={roomSize} onChange={(e) => setRoomSize(e.target.value)} placeholder="e.g. 320 sqft" />
              </div>
              <div>
                <Label className="text-xs">Max Occupancy</Label>
                <Input type="number" value={maxOccupancy} onChange={(e) => setMaxOccupancy(e.target.value)} placeholder="e.g. 2" />
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

          {/* Facilities */}
          <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3">Facilities</p>
            <div className="flex flex-wrap gap-1.5">
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

          {/* Pricing */}
          <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3">Pricing</p>
            <div>
              <Label className="text-xs">Base Price / night</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 5000" />
            </div>

            {price.trim() && (
              matchedVariant ? (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>This configuration matches an existing room variant — {matchedVariant.room_details.length} existing room{matchedVariant.room_details.length === 1 ? '' : 's'} will be joined.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/30 p-2.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>No exact match found among this room type&apos;s existing configurations — a new one will be created automatically.</span>
                </div>
              )
            )}
          </div>

          {/* Images */}
          <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3">Photos (shared by the resulting configuration)</p>
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => setFiles(files.filter((_, fi) => fi !== i))} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-emerald-500 cursor-pointer transition">
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])} />
                <Upload className="h-4 w-4" />
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes, optional" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving || !price.trim() || (mode === 'single' ? !roomNumber.trim() : !roomNumbers.trim() || !!bulkPreview?.error)}
            onClick={submit}
          >
            {mode === 'bulk' && bulkPreview && !bulkPreview.error ? `Create ${bulkPreview.roomNumbers.length} Rooms` : 'Create Room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}