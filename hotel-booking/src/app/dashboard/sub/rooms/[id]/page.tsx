'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Info,
  Image as ImageIcon,
  X,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface RoomType {
  id: number
  name: string
  base_price: string
}

interface RoomImage {
  id: number
  image_url: string
  is_cover: boolean
}

interface RoomData {
  id: number
  room_type_id: number
  room_number: string
  floor: number
  price: string
  status: string
  ac: boolean
  smoking_allowed: boolean
  pet_allowed: boolean
  notes: string | null
}

export default function SubAdminEditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [roomImages, setRoomImages] = useState<RoomImage[]>([])

  const [formData, setFormData] = useState({
    room_type_id: '',
    room_number: '',
    floor: 0,
    price: 0,
    status: 'AVAILABLE',
    ac: true,
    smoking_allowed: false,
    pet_allowed: false,
    notes: '',
    prefix: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomTypesRes, roomsRes, imagesRes] = await Promise.all([
          fetch('/api/hotel-admin/room-types', { credentials: 'include' }),
          fetch(`/api/hotel-admin/rooms?limit=500`, { credentials: 'include' }),
          fetch(`/api/hotel-admin/rooms/${resolvedParams.id}/images`, { credentials: 'include' })
        ])

        const typesData = await roomTypesRes.json()
        const roomsData = await roomsRes.json()
        const imagesData = await imagesRes.json()

        if (typesData.success) setRoomTypes(typesData.data)
        if (imagesData.success) setRoomImages(imagesData.data)

        if (roomsData.success) {
          const roomList: RoomData[] = roomsData.data.rooms ?? roomsData.data
          const room = roomList.find(r => r.id.toString() === resolvedParams.id)
          if (room) {
            setFormData({
              room_type_id: room.room_type_id.toString(),
              room_number: room.room_number,
              floor: room.floor,
              price: parseFloat(room.price),
              status: room.status,
              ac: room.ac,
              smoking_allowed: room.smoking_allowed,
              pet_allowed: room.pet_allowed,
              notes: room.notes || '',
              prefix: ''
            })
          } else {
            toast({ title: 'Error', description: 'Room not found', variant: 'destructive' })
            router.push('/dashboard/sub/rooms')
          }
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.id, toast, router])

  const handleRoomTypeChange = (val: string) => {
    const selectedType = roomTypes.find(t => t.id.toString() === val)
    setFormData(prev => ({
      ...prev,
      room_type_id: val,
      price: selectedType ? parseFloat(selectedType.base_price) : prev.price
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      ...formData,
      room_type_id: parseInt(formData.room_type_id),
      floor: parseInt(formData.floor.toString()),
      price: parseFloat(formData.price.toString())
    }

    try {
      const res = await fetch(`/api/hotel-admin/rooms/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Room updated successfully', variant: 'success' })
        router.push('/dashboard/sub/rooms')
        router.refresh()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update room', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const formDataToSubmit = new FormData()
    Array.from(files).forEach(file => formDataToSubmit.append('files', file))

    try {
      const res = await fetch(`/api/hotel-admin/rooms/${resolvedParams.id}/images`, {
        method: 'POST',
        body: formDataToSubmit,
        credentials: 'include'
      })
      const data = await res.json()
      if (data.success) {
        setRoomImages(prev => [...prev, ...data.data])
        toast({ title: 'Success', description: 'Images uploaded successfully', variant: 'success' })
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to upload images', variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSetCover = async (imageId: number) => {
    try {
      const res = await fetch(`/api/hotel-admin/rooms/${resolvedParams.id}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_cover: true }),
        credentials: 'include'
      })
      if (res.ok) {
        setRoomImages(prev => prev.map(img => ({ ...img, is_cover: img.id === imageId })))
        toast({ title: 'Success', description: 'Cover image updated', variant: 'success' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to set cover image', variant: 'destructive' })
    }
  }

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Delete this image?')) return
    try {
      const res = await fetch(`/api/hotel-admin/rooms/${resolvedParams.id}/images/${imageId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setRoomImages(prev => prev.filter(img => img.id !== imageId))
        toast({ title: 'Success', description: 'Image deleted', variant: 'success' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete image', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Room {formData.room_number}</h1>
          <p className="text-muted-foreground mt-1">Update details for this physical room instance.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Information */}
        <Card className="glass-strong border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              General Information
            </CardTitle>
            <CardDescription>Manage the room type, number, and nightly pricing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Room Type</Label>
                <Select value={formData.room_type_id} onValueChange={handleRoomTypeChange}>
                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent>
                    {roomTypes.map(type => (
                      <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prefix (Optional)</Label>
                <Input
                  placeholder="e.g. A-"
                  value={formData.prefix}
                  onChange={(e) => setFormData(p => ({ ...p, prefix: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input
                  value={formData.room_number}
                  onChange={(e) => setFormData(p => ({ ...p, room_number: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData(p => ({ ...p, floor: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nightly Price (TK)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="UNAVAILABLE">Occupied</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Facilities</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center space-x-3">
                  <Checkbox id="e-ac" checked={formData.ac} onCheckedChange={(v) => setFormData(p => ({ ...p, ac: !!v }))} />
                  <label htmlFor="e-ac" className="text-sm font-medium cursor-pointer">Air Conditioning</label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="e-smk" checked={formData.smoking_allowed} onCheckedChange={(v) => setFormData(p => ({ ...p, smoking_allowed: !!v }))} />
                  <label htmlFor="e-smk" className="text-sm font-medium cursor-pointer">Smoking Allowed</label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="e-pet" checked={formData.pet_allowed} onCheckedChange={(v) => setFormData(p => ({ ...p, pet_allowed: !!v }))} />
                  <label htmlFor="e-pet" className="text-sm font-medium cursor-pointer">Pets Allowed</label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Input
                placeholder="e.g. Mountain view, near stairs"
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Room Images */}
        <Card className="glass-strong border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Room Images
            </CardTitle>
            <CardDescription>Upload and manage photos for this specific room.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {roomImages.map((img) => (
                <div key={img.id} className="relative w-32 h-32 rounded-lg overflow-hidden border group shadow-sm bg-muted/20">
                  <img src={img.image_url} className="w-full h-full object-cover" alt="" />

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleSetCover(img.id)}
                      title="Set as cover"
                    >
                      <Star className={`w-4 h-4 ${img.is_cover ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => handleDeleteImage(img.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {img.is_cover && (
                    <div className="absolute top-1 left-1">
                      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-[10px] px-1.5 h-4">Cover</Badge>
                    </div>
                  )}
                </div>
              ))}

              <Label className={`w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {isUploading ? 'Uploading...' : 'Add Photo'}
                  </span>
                </div>
                <Input type="file" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2 px-8 shadow-lg">
            {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  )
}