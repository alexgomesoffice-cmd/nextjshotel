'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  Bed,
  Layers,
  Info,
  Plus
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface RoomType {
  id: number
  name: string
  base_price: string
}

export default function NewRoomPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [creationMode, setCreationMode] = useState<'SINGLE' | 'BULK'>('SINGLE')

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

  const [bulkData, setBulkData] = useState({
    room_type_id: '',
    prefix: '',
    start_number: 1,
    end_number: 10,
    floor: 0,
    price: 0,
    ac: true,
    smoking_allowed: false,
    pet_allowed: false,
    notes: ''
  })

  useEffect(() => {
    fetch('/api/hotel-admin/room-types', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) setRoomTypes(data.data)
      })
  }, [])

  const handleRoomTypeChange = (val: string, isBulk: boolean = false) => {
    const selectedType = roomTypes.find(t => t.id.toString() === val)
    if (isBulk) {
      setBulkData(prev => ({
        ...prev,
        room_type_id: val,
        price: selectedType ? parseFloat(selectedType.base_price) : prev.price
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        room_type_id: val,
        price: selectedType ? parseFloat(selectedType.base_price) : prev.price
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    let payload: any
    if (creationMode === 'BULK') {
      payload = {
        ...bulkData,
        bulk: true,
        room_type_id: parseInt(bulkData.room_type_id),
        start_number: parseInt(bulkData.start_number.toString()),
        end_number: parseInt(bulkData.end_number.toString()),
        floor: parseInt(bulkData.floor.toString()),
        price: parseFloat(bulkData.price.toString())
      }
    } else {
      payload = {
        ...formData,
        room_type_id: parseInt(formData.room_type_id),
        floor: parseInt(formData.floor.toString()),
        price: parseFloat(formData.price.toString())
      }
    }

    try {
      const res = await fetch('/api/hotel-admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: data.message || 'Room(s) created successfully', variant: 'success' })
        router.push('/dashboard/hotel/rooms')
        router.refresh()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create room', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Room</h1>
          <p className="text-muted-foreground mt-1">Add a single room or bulk generate multiple rooms for your inventory.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={creationMode} onValueChange={(v: any) => setCreationMode(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
            <TabsTrigger value="SINGLE">Single Room</TabsTrigger>
            <TabsTrigger value="BULK">Bulk Generate</TabsTrigger>
          </TabsList>

          <TabsContent value="SINGLE" className="space-y-6 animate-fade-in">
            <Card className="glass-strong border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bed className="w-5 h-5 text-primary" />
                  Room Details
                </CardTitle>
                <CardDescription>Enter the basic information for the new room instance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Room Type</Label>
                    <Select value={formData.room_type_id} onValueChange={(v) => handleRoomTypeChange(v, false)}>
                      <SelectTrigger><SelectValue placeholder="Select Room Type" /></SelectTrigger>
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
                      placeholder="e.g. 101, A-5" 
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
                    <Label>Initial Status</Label>
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
                  <Label>Facilities</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="s-ac" checked={formData.ac} onCheckedChange={(v) => setFormData(p => ({ ...p, ac: !!v }))} />
                      <label htmlFor="s-ac" className="text-sm font-medium cursor-pointer">Air Conditioning</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="s-smk" checked={formData.smoking_allowed} onCheckedChange={(v) => setFormData(p => ({ ...p, smoking_allowed: !!v }))} />
                      <label htmlFor="s-smk" className="text-sm font-medium cursor-pointer">Smoking Allowed</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="s-pet" checked={formData.pet_allowed} onCheckedChange={(v) => setFormData(p => ({ ...p, pet_allowed: !!v }))} />
                      <label htmlFor="s-pet" className="text-sm font-medium cursor-pointer">Pets Allowed</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Input 
                    placeholder="e.g. Recently painted, near elevator" 
                    value={formData.notes} 
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="BULK" className="space-y-6 animate-fade-in">
            <Card className="glass-strong border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Bulk Configuration
                </CardTitle>
                <CardDescription>Automatically generate multiple rooms by specifying a range.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select value={bulkData.room_type_id} onValueChange={(v) => handleRoomTypeChange(v, true)}>
                    <SelectTrigger><SelectValue placeholder="Select Room Type" /></SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(type => (
                        <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Room Prefix (Optional)</Label>
                    <Input 
                      placeholder="e.g. A-, FL1-" 
                      value={bulkData.prefix} 
                      onChange={(e) => setBulkData(p => ({ ...p, prefix: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Number</Label>
                    <Input 
                      type="number" 
                      value={bulkData.start_number} 
                      onChange={(e) => setBulkData(p => ({ ...p, start_number: parseInt(e.target.value) || 1 }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Number</Label>
                    <Input 
                      type="number" 
                      value={bulkData.end_number} 
                      onChange={(e) => setBulkData(p => ({ ...p, end_number: parseInt(e.target.value) || 1 }))} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Floor</Label>
                    <Input 
                      type="number" 
                      value={bulkData.floor} 
                      onChange={(e) => setBulkData(p => ({ ...p, floor: parseInt(e.target.value) || 0 }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price / Night (৳)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={bulkData.price} 
                      onChange={(e) => setBulkData(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Common Facilities</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="b-ac" checked={bulkData.ac} onCheckedChange={(v) => setBulkData(p => ({ ...p, ac: !!v }))} />
                      <label htmlFor="b-ac" className="text-sm font-medium cursor-pointer">AC</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="b-smk" checked={bulkData.smoking_allowed} onCheckedChange={(v) => setBulkData(p => ({ ...p, smoking_allowed: !!v }))} />
                      <label htmlFor="b-smk" className="text-sm font-medium cursor-pointer">Smoking</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="b-pet" checked={bulkData.pet_allowed} onCheckedChange={(v) => setBulkData(p => ({ ...p, pet_allowed: !!v }))} />
                      <label htmlFor="b-pet" className="text-sm font-medium cursor-pointer">Pets</label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2 px-8 shadow-lg">
            {isSubmitting ? 'Creating...' : <><Plus className="w-4 h-4" /> {creationMode === 'BULK' ? 'Generate Rooms' : 'Create Room'}</>}
          </Button>
        </div>
      </form>
    </div>
  )
}
