'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, Loader2, X, ArrowLeft } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'

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

export default function NewRoomTypePage() {
  const { toast } = useToast()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [availableBeds, setAvailableBeds] = useState<BedType[]>([])
  const [availableAmenities, setAvailableAmenities] = useState<Amenity[]>([])
  
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [bedRes, amRes] = await Promise.all([
        fetch('/api/hotel-admin/bed-types', { credentials: 'include' }),
        fetch('/api/hotel-admin/amenities', { credentials: 'include' })
      ])
      
      const bedData = await bedRes.json()
      const amData = await amRes.json()

      if (bedData.success) setAvailableBeds(bedData.data)
      if (amData.success) setAvailableAmenities(amData.data.ROOM || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load options', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

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

      const res = await fetch('/api/hotel-admin/room-types', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.success) {
        toast({ title: 'Success', description: 'Room type created. You can now add images.', variant: 'success' })
        router.push(`/dashboard/hotel/room-types/${data.data.id}`)
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/hotel/room-types">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Room Type</h1>
          <p className="text-muted-foreground mt-1">Configure the base settings for this category of rooms.</p>
        </div>
      </div>

      <Card className="glass-strong">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label>Room Type Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Deluxe Sea View" />
            </div>
            <div className="space-y-1.5">
              <Label>Base Price (BDT) *</Label>
              <Input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} placeholder="e.g. 5000" />
              <p className="text-[10px] text-muted-foreground">Default display price. Actual pricing can be set per physical room.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Max Occupancy *</Label>
              <Input type="number" value={form.max_occupancy} onChange={e => setForm(f => ({ ...f, max_occupancy: e.target.value }))} placeholder="e.g. 2" />
            </div>
            <div className="space-y-1.5">
              <Label>Room Size</Label>
              <Input value={form.room_size} onChange={e => setForm(f => ({ ...f, room_size: e.target.value }))} placeholder="e.g. 320 sqft" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the room..." />
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
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : (
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
          )}
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

      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        <Link href="/dashboard/hotel/room-types">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save & Continue
        </Button>
      </div>
    </div>
  )
}
