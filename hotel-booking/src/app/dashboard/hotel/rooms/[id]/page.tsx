'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  Bed,
  Info,
  Wrench,
  DollarSign
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
import { useToast } from '@/hooks/use-hooks'
import { Skeleton } from '@/components/ui/skeleton'

interface RoomType {
  id: number
  name: string
  base_price: string
}

export default function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  
  const [formData, setFormData] = useState({
    room_type_id: '',
    room_number: '',
    floor: 0,
    price: 0,
    status: 'AVAILABLE',
    ac: true,
    smoking_allowed: false,
    pet_allowed: false,
    notes: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomTypesRes, roomsRes] = await Promise.all([
          fetch('/api/hotel-admin/room-types', { credentials: 'include' }),
          fetch('/api/hotel-admin/rooms', { credentials: 'include' })
        ])

        const typesData = await roomTypesRes.json()
        const roomsData = await roomsRes.json()

        if (typesData.success) setRoomTypes(typesData.data)
        
        if (roomsData.success) {
          const room = roomsData.data.find((r: any) => r.id.toString() === resolvedParams.id)
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
              notes: room.notes || ''
            })
          } else {
            toast({ title: 'Error', description: 'Room not found', variant: 'destructive' })
            router.push('/dashboard/hotel/rooms')
          }
        }
      } catch (error) {
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
        router.push('/dashboard/hotel/rooms')
        router.refresh()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update room', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-[300px]" />
        <Skeleton className="h-[400px] w-full" />
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
        <Card className="glass-strong border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              General Information
            </CardTitle>
            <CardDescription>Manage the room type, number, and nightly pricing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <Label>Nightly Price (৳)</Label>
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
                <Select value={formData.status} onValueChange={(v: any) => setFormData(p => ({ ...p, status: v }))}>
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
              <Label>Facilities & Policy</Label>
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
