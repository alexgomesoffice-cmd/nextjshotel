'use client'

import { useEffect, useState, useCallback, useRef, use } from 'react'
import { Save, Loader2, X, ArrowLeft, Image as ImageIcon, Trash2, Star, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-hooks'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface BedType {
  id: number
  name: string
  is_default: boolean
}

interface Amenity {
  id: number
  name: string
  context: 'HOTEL' | 'ROOM'
  is_default: boolean
}

interface RoomTypeImage {
  id: number
  image_url: string
  is_cover: boolean
}

const defaultForm = {
  name: '',
  description: '',
  base_price: '',
  room_size: '',
  max_occupancy: '2',
  cancellation_policy: 'FLEXIBLE',
  cancellation_hours: '',
  refund_percent: '',
  check_in_time: '14:00',
  check_out_time: '12:00',
  bed_types: [] as { bed_type_id: number; count: number }[],
  amenity_ids: [] as number[]
}

export default function EditRoomTypePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  
  const { toast } = useToast()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [availableBeds, setAvailableBeds] = useState<BedType[]>([])
  const [availableAmenities, setAvailableAmenities] = useState<Amenity[]>([])
  
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState<RoomTypeImage[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [rtRes, bedRes, amRes] = await Promise.all([
        fetch(`/api/hotel-admin/room-types/${id}`, { credentials: 'include' }),
        fetch('/api/hotel-admin/bed-types', { credentials: 'include' }),
        fetch('/api/hotel-admin/amenities', { credentials: 'include' })
      ])
      
      const rtData = await rtRes.json()
      const bedData = await bedRes.json()
      const amData = await amRes.json()

      if (bedData.success) setAvailableBeds(bedData.data)
      if (amData.success) setAvailableAmenities(amData.data.ROOM || [])

      if (rtData.success) {
        const rt = rtData.data
        setForm({
          name: rt.name,
          description: rt.description || '',
          base_price: rt.base_price.toString(),
          room_size: rt.room_size || '',
          max_occupancy: rt.max_occupancy.toString(),
          cancellation_policy: rt.cancellation_policy,
          cancellation_hours: rt.cancellation_hours?.toString() || '',
          refund_percent: rt.refund_percent?.toString() || '',
          check_in_time: rt.check_in_time || '14:00',
          check_out_time: rt.check_out_time || '12:00',
          bed_types: rt.room_bed_types.map((b: any) => ({ bed_type_id: b.bed_type.id, count: b.count })),
          amenity_ids: rt.room_properties.map((a: any) => a.amenity.id)
        })
        setImages(rt.type_images)
      } else {
        toast({ title: 'Error', description: rtData.message, variant: 'destructive' })
        router.push('/dashboard/hotel/room-types')
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load room type', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast, id, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    if (!form.name || !form.base_price || !form.max_occupancy) {
      toast({ title: 'Validation', description: 'Name, Base Price, and Max Occupancy are required', variant: 'destructive' })
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: form.name,
        description: form.description || null,
        base_price: parseFloat(form.base_price),
        room_size: form.room_size || null,
        max_occupancy: parseInt(form.max_occupancy),
        cancellation_policy: form.cancellation_policy,
        cancellation_hours: form.cancellation_policy === 'CUSTOM' ? parseInt(form.cancellation_hours) : null,
        refund_percent: form.cancellation_policy === 'CUSTOM' ? parseInt(form.refund_percent) : null,
        check_in_time: form.check_in_time,
        check_out_time: form.check_out_time,
        bed_types: form.bed_types,
        amenity_ids: form.amenity_ids
      }

      const res = await fetch(`/api/hotel-admin/room-types/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.success) {
        toast({ title: 'Success', description: 'Room type updated', variant: 'success' })
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save room type', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggleAmenity = (id: number) => {
    setForm(f => {
      const exists = f.amenity_ids.includes(id)
      if (exists) return { ...f, amenity_ids: f.amenity_ids.filter(x => x !== id) }
      return { ...f, amenity_ids: [...f.amenity_ids, id] }
    })
  }

  const addBedType = (bedId: number) => {
    if (!bedId) return
    setForm(f => {
      const existing = f.bed_types.find(b => b.bed_type_id === bedId)
      if (existing) {
        return { ...f, bed_types: f.bed_types.map(b => b.bed_type_id === bedId ? { ...b, count: b.count + 1 } : b) }
      }
      return { ...f, bed_types: [...f.bed_types, { bed_type_id: bedId, count: 1 }] }
    })
  }

  const removeBedType = (bedId: number) => {
    setForm(f => ({ ...f, bed_types: f.bed_types.filter(b => b.bed_type_id !== bedId) }))
  }

  // --- Image Handling ---
  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) formData.append('files', files[i])

    try {
      setUploading(true)
      const res = await fetch(`/api/hotel-admin/room-types/${id}/images`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setImages(prev => [...prev, ...data.data])
        toast({ title: 'Success', description: 'Images uploaded', variant: 'success' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to upload images', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Delete this image?')) return
    try {
      const res = await fetch(`/api/hotel-admin/room-types/${id}/images/${imageId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if ((await res.json()).success) {
        setImages(prev => prev.filter(img => img.id !== imageId))
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete image', variant: 'destructive' })
    }
  }

  const handleSetCover = async (imageId: number) => {
    try {
      const res = await fetch(`/api/hotel-admin/room-types/${id}/images/${imageId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_cover: true })
      })
      if ((await res.json()).success) {
        setImages(prev => prev.map(img => ({ ...img, is_cover: img.id === imageId })))
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to set cover', variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/hotel/room-types">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Edit {form.name || 'Room Type'}</h1>
            <p className="text-muted-foreground mt-1">Manage configuration and photos.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label>Room Type Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Base Price (BDT) *</Label>
                  <Input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Occupancy *</Label>
                  <Input type="number" value={form.max_occupancy} onChange={e => setForm(f => ({ ...f, max_occupancy: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Room Size</Label>
                  <Input value={form.room_size} onChange={e => setForm(f => ({ ...f, room_size: e.target.value }))} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Description</Label>
                  <Textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Bed Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={(val) => addBedType(parseInt(val))}>
                <SelectTrigger className="w-[300px]"><SelectValue placeholder="Add Bed Type..." /></SelectTrigger>
                <SelectContent>
                  {availableBeds.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.bed_types.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {form.bed_types.map(bt => {
                    const bed = availableBeds.find(a => a.id === bt.bed_type_id)
                    return (
                      <Badge key={bt.bed_type_id} variant="secondary" className="pl-3 pr-2 py-2 flex items-center gap-3 text-sm">
                        {bed?.name}
                        <div className="flex items-center bg-background rounded-md px-2 h-6 text-xs font-bold text-primary">
                          x{bt.count}
                        </div>
                        <button onClick={() => removeBedType(bt.bed_type_id)} className="hover:bg-destructive hover:text-white rounded-full p-1 ml-1 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Room Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableAmenities.map(am => {
                  const isSelected = form.amenity_ids.includes(am.id)
                  return (
                    <label key={am.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/50'}`}>
                      <input 
                        type="checkbox" 
                        className="accent-primary w-4 h-4 rounded border-gray-300"
                        checked={isSelected}
                        onChange={() => toggleAmenity(am.id)}
                      />
                      <span className="text-sm font-medium">{am.name}</span>
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label>Cancellation Policy</Label>
                  <Select value={form.cancellation_policy} onValueChange={v => setForm(f => ({ ...f, cancellation_policy: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLEXIBLE">Flexible</SelectItem>
                      <SelectItem value="MODERATE">Moderate</SelectItem>
                      <SelectItem value="STRICT">Strict</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.cancellation_policy === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/20 border border-secondary">
                     <div className="space-y-1.5">
                      <Label className="text-sm">Cancel Before (Hours)</Label>
                      <Input type="number" value={form.cancellation_hours} onChange={e => setForm(f => ({ ...f, cancellation_hours: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Refund %</Label>
                      <Input type="number" value={form.refund_percent} onChange={e => setForm(f => ({ ...f, refund_percent: e.target.value }))} />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Check-In Time</Label>
                  <Input type="time" value={form.check_in_time} onChange={e => setForm(f => ({ ...f, check_in_time: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Check-Out Time</Label>
                  <Input type="time" value={form.check_out_time} onChange={e => setForm(f => ({ ...f, check_out_time: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gallery Sidebar */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Image Gallery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary/20 border border-border/50 rounded-xl p-4 text-center">
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleUploadImages} />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline" className="w-full gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  {uploading ? 'Uploading...' : 'Upload Photos'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {images.map(img => (
                  <div key={img.id} className={`group relative aspect-square rounded-lg overflow-hidden border-2 ${img.is_cover ? 'border-primary' : 'border-transparent'}`}>
                    <Image src={img.image_url} alt="Room" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                      <div className="flex justify-end">
                        <button onClick={() => handleDeleteImage(img.id)} className="p-1 bg-destructive/90 text-white rounded hover:bg-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {!img.is_cover && (
                        <Button variant="secondary" size="sm" className="w-full text-[10px] h-6 px-0" onClick={() => handleSetCover(img.id)}>
                          <Star className="h-3 w-3 mr-1" /> Cover
                        </Button>
                      )}
                    </div>
                    {img.is_cover && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 py-0.5 rounded shadow">
                        COVER
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {images.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No images uploaded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
