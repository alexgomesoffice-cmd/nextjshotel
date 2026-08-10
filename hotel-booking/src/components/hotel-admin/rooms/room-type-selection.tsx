'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Plus, BedDouble, Pencil, ChevronDown, ChevronRight, DoorOpen } from 'lucide-react'
import { RoomFormDialog } from './room-form-dialog'

type RoomDetail = { id: number; room_number: string; floor: number | null; status: string }
type Variant = {
  id: number
  price: string
  room_size: string | null
  max_occupancy: number | null
  facilities: { facility: { id: number; name: string } }[]
  bed_types: { bed_type: { id: number; name: string }; count: number }[]
  variant_images: { image_url: string }[]
  room_details: RoomDetail[]
}
type RoomType = {
  id: number
  name: string
  description: string | null
  room_type_amenities: { amenity: { id: number; name: string } }[]
  room_variants: Variant[]
}

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'bg-green-500/10 text-green-600 border-green-500/30',
  BOOKED: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  CHECKED_IN: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  CHECKED_OUT: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  MAINTENANCE: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
}

function variantLabel(v: Variant): string {
  const beds = v.bed_types.map((b) => `${b.count} × ${b.bed_type.name}`).join(', ')
  const facilities = v.facilities.map((f) => f.facility.name).join(' · ')
  return [beds, facilities].filter(Boolean).join(' · ') || 'No configuration set'
}

export const RoomTypesSection = () => {
  const { toast } = useToast()
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editType, setEditType] = useState<RoomType | null>(null)
  const [addRoomFor, setAddRoomFor] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const fetchRoomTypes = useCallback(async () => {
    const res = await fetch('/api/hotel-admin/room-types', { credentials: 'include' })
    const data = await res.json()
    if (data.success) setRoomTypes(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRoomTypes() }, [fetchRoomTypes])

  const toggleExpanded = (id: number) => {
    setExpanded((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const changeStatus = async (roomId: number, status: string) => {
    const res = await fetch(`/api/hotel-admin/rooms/${roomId}/status`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (data.success) {
      toast({ title: 'Status updated' })
      fetchRoomTypes()
    } else {
      toast({ title: 'Could not update status', description: data.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-xl">
          Room Types, Variants, and Physical Rooms are all managed directly — changes go live immediately, no review needed.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Room Type
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : roomTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto">
              <BedDouble className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-medium">No room types yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create one to start adding rooms.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {roomTypes.map((rt) => (
            <Card key={rt.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{rt.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{rt.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditType(rt)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAddRoomFor(rt.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Room
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {rt.room_variants.length === 0 && (
                    <p className="text-xs text-muted-foreground py-3">No rooms yet — click Add Room to create the first one.</p>
                  )}
                  {rt.room_variants.map((v) => {
                    const isOpen = expanded.has(v.id)
                    return (
                      <div key={v.id} className="rounded-xl border border-border/60 overflow-hidden">
                        <button
                          onClick={() => toggleExpanded(v.id)}
                          className="w-full flex items-center justify-between gap-3 p-3 hover:bg-secondary/30 transition text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{variantLabel(v)}</p>
                              <p className="text-xs text-muted-foreground">
                                ৳{Number(v.price).toLocaleString()}/night
                                {v.max_occupancy ? ` · ${v.max_occupancy} guests` : ''}
                                {v.room_size ? ` · ${v.room_size}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{v.room_details.length} room{v.room_details.length === 1 ? '' : 's'}</span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-border/60 p-3 flex flex-wrap gap-2">
                            {v.room_details.map((r) => (
                              <div key={r.id} className={cn('flex items-center gap-1.5 rounded-lg border px-2 py-1', STATUS_COLOR[r.status] ?? '')}>
                                <DoorOpen className="h-3 w-3" />
                                <span className="text-xs font-medium">{r.room_number}</span>
                                <select
                                  value={r.status}
                                  onChange={(e) => changeStatus(r.id, e.target.value)}
                                  className="text-[10px] bg-transparent border-0 outline-none cursor-pointer"
                                >
                                  {Object.keys(STATUS_COLOR).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoomTypeFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={fetchRoomTypes} />
      <RoomTypeFormDialog open={!!editType} onOpenChange={(v) => !v && setEditType(null)} existing={editType} onSaved={fetchRoomTypes} />
      <RoomFormDialog open={!!addRoomFor} onOpenChange={(v) => !v && setAddRoomFor(null)} roomTypeId={addRoomFor} onCreated={fetchRoomTypes} />
    </div>
  )
}

const RoomTypeFormDialog = ({
  open, onOpenChange, existing, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; existing?: RoomType | null; onSaved: () => void }) => {
  const { toast } = useToast()
  const [amenities, setAmenities] = useState<{ id: number; name: string }[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/hotel-admin/amenities', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAmenities(d?.data?.ROOM ?? []))
      .catch(() => setAmenities([]))
    setName(existing?.name ?? '')
    setDescription(existing?.description ?? '')
    setSelectedAmenities(existing?.room_type_amenities.map((a) => a.amenity.id) ?? [])
  }, [open, existing])

  const toggleAmenity = (id: number) => {
    setSelectedAmenities((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const url = existing ? `/api/hotel-admin/room-types/${existing.id}` : '/api/hotel-admin/room-types'
      const res = await fetch(url, {
        method: existing ? 'PATCH' : 'POST',
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, amenity_ids: selectedAmenities }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: existing ? 'Room type updated' : 'Room type created' })
        onOpenChange(false)
        onSaved()
      } else {
        toast({ title: 'Could not save', description: data.message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Room Type' : 'New Room Type'}</DialogTitle>
          <DialogDescription>Live immediately — no approval needed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deluxe Room" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What makes this room type special…" />
          </div>
          <div>
            <Label className="text-xs">Room Amenities</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {amenities.map((a) => {
                const checked = selectedAmenities.includes(a.id)
                return (
                  <button key={a.id} type="button" onClick={() => toggleAmenity(a.id)}
                    className={cn('text-xs px-2.5 py-1.5 rounded-full border transition',
                      checked ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' : 'border-border bg-secondary/30 text-muted-foreground')}>
                    {a.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving || !name.trim()} onClick={submit}>{existing ? 'Save Changes' : 'Create Room Type'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}