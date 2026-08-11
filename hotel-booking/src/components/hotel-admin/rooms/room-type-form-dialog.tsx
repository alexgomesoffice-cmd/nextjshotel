'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'
import { ImageManager, ManagedImage } from './image-manager'

export type RoomTypeSummary = {
  id: number
  name: string
  description: string | null
  is_active: boolean
  room_type_amenities: { amenity: { id: number; name: string } }[]
  type_images: ManagedImage[]
}

export const RoomTypeFormDialog = ({
  open, onOpenChange, existing, defaultTab, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; existing?: RoomTypeSummary | null; defaultTab?: 'details' | 'images'; onSaved: () => void }) => {
  const { toast } = useToast()
  const [amenities, setAmenities] = useState<{ id: number; name: string }[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [images, setImages] = useState<ManagedImage[]>([])
  const [tab, setTab] = useState<'details' | 'images'>('details')

  const roomTypeId = existing?.id ?? createdId

  useEffect(() => {
    if (!open) return
    fetch('/api/hotel-admin/amenities', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAmenities(d?.data?.ROOM ?? []))
      .catch(() => setAmenities([]))
    setName(existing?.name ?? '')
    setDescription(existing?.description ?? '')
    setSelectedAmenities(existing?.room_type_amenities.map((a) => a.amenity.id) ?? [])
    setImages(existing?.type_images ?? [])
    setCreatedId(null)
    setTab(defaultTab === 'images' && existing ? 'images' : 'details')
  }, [open, existing])

  const toggleAmenity = (id: number) => {
    setSelectedAmenities((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const refetchImages = async () => {
    if (!roomTypeId) return
    const res = await fetch(`/api/hotel-admin/room-types/${roomTypeId}/images`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) setImages(data.data)
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
        if (!existing) { setCreatedId(data.data.id); setTab('images') } // stay open so they can add images right away
        onSaved()
        if (existing) onOpenChange(false)
      } else {
        toast({ title: 'Could not save', description: data.message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Room Type' : 'New Room Type'}</DialogTitle>
          <DialogDescription>Live immediately — no approval needed.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'details' | 'images')}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="images" disabled={!roomTypeId}>
              {!roomTypeId && <Lock className="h-3 w-3 mr-1" />} Images
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 mt-4">
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
          </TabsContent>

          <TabsContent value="images" className="mt-4">
            {roomTypeId ? (
              <ImageManager
                images={images}
                uploadUrl={`/api/hotel-admin/room-types/${roomTypeId}/images`}
                deleteUrlFor={(id) => `/api/hotel-admin/room-types/${roomTypeId}/images/${id}`}
                coverUrlFor={(id) => `/api/hotel-admin/room-types/${roomTypeId}/images/${id}`}
                onChanged={refetchImages}
              />
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">Save the room type first to add images.</p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{createdId ? 'Done' : 'Cancel'}</Button>
          {!(createdId) && (
            <Button disabled={saving || !name.trim()} onClick={submit}>{existing ? 'Save Changes' : 'Create Room Type'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}