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
import { Plus, BedDouble, Upload, X, ClipboardList } from 'lucide-react'

type RoomType = {
  id: number
  name: string
  description: string | null
  room_count: number
  room_type_amenities: { amenity: { id: number; name: string } }[]
  type_images: { image_url: string }[]
}

export const RoomTypesSection = () => {
  const { toast } = useToast()
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchRoomTypes = useCallback(async () => {
    const res = await fetch('/api/hotel-admin/room-types', { credentials: 'include' })
    const data = await res.json()
    if (data.success) setRoomTypes(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRoomTypes() }, [fetchRoomTypes])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-xl">
          Room types are yours to create directly — proposals are reviewed by the System Admin and appear in Draft Center until decided.
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
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
            <p className="text-sm text-muted-foreground mt-1">Propose your first room type to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {roomTypes.map((rt) => (
            <Card key={rt.id} className="overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-indigo-500/20 via-blue-400/10 to-transparent relative">
                {rt.type_images?.[0]?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rt.type_images[0].image_url} alt="" className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute bottom-3 right-3 text-right">
                  <span className="text-xs px-2 py-1 rounded-full bg-background/80 backdrop-blur font-medium">
                    {rt.room_count} room{rt.room_count === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <CardContent className="p-5 space-y-3">
                <div>
                  <h3 className="font-semibold">{rt.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{rt.description}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {rt.room_type_amenities.slice(0, 4).map((ra) => (
                    <span key={ra.amenity.id} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">{ra.amenity.name}</span>
                  ))}
                  {rt.room_type_amenities.length > 4 && <span className="text-[10px] text-muted-foreground">+{rt.room_type_amenities.length - 4}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewRoomTypeDialog open={open} onOpenChange={setOpen} onProposed={fetchRoomTypes} />
    </div>
  )
}

const NewRoomTypeDialog = ({ open, onOpenChange, onProposed }: { open: boolean; onOpenChange: (v: boolean) => void; onProposed: () => void }) => {
  const { toast } = useToast()
  const [amenities, setAmenities] = useState<{ id: number; name: string }[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/hotel-admin/amenities', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAmenities(d?.data?.ROOM ?? []))
      .catch(() => setAmenities([]))
  }, [open])

  const toggleAmenity = (id: number) => {
    setSelectedAmenities((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const reset = () => {
    setName(''); setDescription(''); setSelectedAmenities([]); setFile(null)
  }

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('description', description)
      fd.append('amenity_ids', JSON.stringify(selectedAmenities))
      if (file) fd.append('file', file)
      const res = await fetch('/api/hotel-admin/room-types/propose', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Room type proposed', description: 'Check Draft Center to submit it for review.' })
        reset()
        onOpenChange(false)
        onProposed()
      } else {
        toast({ title: 'Could not propose room type', description: data.message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Room Type</DialogTitle>
          <DialogDescription>Reviewed by the System Admin — track it in Draft Center.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deluxe King Suite" />
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
                  <button
                    key={a.id} type="button" onClick={() => toggleAmenity(a.id)}
                    className={cn(
                      'text-xs px-2.5 py-1.5 rounded-full border transition',
                      checked ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' : 'border-border bg-secondary/30 text-muted-foreground',
                    )}
                  >
                    {a.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs">Photo (one image)</Label>
            {file ? (
              <div className="relative w-24 h-24 mt-1 rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setFile(null)} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="mt-1 w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-emerald-500 cursor-pointer transition">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <Upload className="h-4 w-4" />
              </label>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving || !name.trim()} onClick={submit}>
            <ClipboardList className="h-4 w-4 mr-2" /> Propose Room Type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}