'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Wifi, Shield, CheckCircle2, XCircle, Plus, Trash2, 
  Hotel, BedDouble, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Amenity {
  id: number
  name: string
  icon: string | null
  context: 'HOTEL' | 'ROOM'
  is_default: boolean
  hotel_id: number | null
  is_active: boolean
}

export default function HotelAmenitiesPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'hotel')
  
  const [amenities, setAmenities] = useState<{ HOTEL: Amenity[], ROOM: Amenity[] }>({ HOTEL: [], ROOM: [] })

  // Modal states
  const [showAddAmenity, setShowAddAmenity] = useState(false)
  const [newAmenity, setNewAmenity] = useState({ name: '', icon: 'CheckCircle2', context: 'HOTEL' as 'HOTEL'|'ROOM' })
  const [addingAmenity, setAddingAmenity] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const amRes = await fetch('/api/hotel-admin/amenities', { credentials: 'include' })
      
      const amData = await amRes.json()

      if (amData.success) setAmenities(amData.data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load amenities', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    // Optional: push to URL to keep it in sync
    // router.push(`/dashboard/hotel/amenities?tab=${val}`)
  }

  const handleAddAmenity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAmenity.name.trim()) return

    try {
      setAddingAmenity(true)
      const res = await fetch('/api/hotel-admin/amenities', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAmenity)
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: 'Success', description: 'Amenity added successfully', variant: 'success' })
        setShowAddAmenity(false)
        setNewAmenity({ name: '', icon: 'CheckCircle2', context: 'HOTEL' })
        fetchData()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add amenity', variant: 'destructive' })
    } finally {
      setAddingAmenity(false)
    }
  }

  const handleDeleteAmenity = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom amenity?')) return
    try {
      const res = await fetch(`/api/hotel-admin/amenities/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Amenity deleted', variant: 'success' })
        fetchData()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete amenity', variant: 'destructive' })
    }
  }

  const AmenityGrid = ({ items, context }: { items: Amenity[], context: 'HOTEL'|'ROOM' }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <div 
          key={item.id} 
          className={`flex items-center justify-between p-4 rounded-xl border ${item.is_default ? 'bg-secondary/20 border-border/50' : 'bg-primary/5 border-primary/20'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.is_default ? 'bg-secondary' : 'bg-primary/10 text-primary'}`}>
              {item.context === 'HOTEL' ? <Hotel className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-medium text-sm">{item.name}</p>
              <Badge variant="outline" className={`mt-1 text-[10px] px-1.5 py-0 border-none ${item.is_default ? 'bg-secondary text-muted-foreground' : 'bg-primary/20 text-primary'}`}>
                {item.is_default ? 'Global Default' : 'Custom'}
              </Badge>
            </div>
          </div>
          {!item.is_default && (
            <button 
              onClick={() => handleDeleteAmenity(item.id)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {items.length === 0 && (
        <div className="col-span-full p-8 text-center border border-dashed rounded-xl border-border">
          <p className="text-muted-foreground">No amenities found for this context.</p>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Card className="glass-strong">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Amenities & Bed Types</h1>
          <p className="text-muted-foreground mt-1">Manage global defaults and add your own custom features</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-6 bg-secondary/50 p-1">
          <TabsTrigger value="hotel">Hotel Amenities</TabsTrigger>
          <TabsTrigger value="room">Room Amenities</TabsTrigger>
        </TabsList>

        <TabsContent value="hotel" className="space-y-4 mt-0 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Features that apply to your entire property (e.g. Pool, Gym).</p>
            <Button size="sm" onClick={() => { setNewAmenity({ ...newAmenity, context: 'HOTEL' }); setShowAddAmenity(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Custom Hotel Amenity
            </Button>
          </div>
          <AmenityGrid items={amenities.HOTEL} context="HOTEL" />
        </TabsContent>

        <TabsContent value="room" className="space-y-4 mt-0 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Features that apply to specific room types (e.g. Balcony, Sea View).</p>
            <Button size="sm" onClick={() => { setNewAmenity({ ...newAmenity, context: 'ROOM' }); setShowAddAmenity(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Custom Room Amenity
            </Button>
          </div>
          <AmenityGrid items={amenities.ROOM} context="ROOM" />
        </TabsContent>
      </Tabs>

      {/* Add Amenity Dialog */}
      <Dialog open={showAddAmenity} onOpenChange={setShowAddAmenity}>
        <DialogContent className="sm:max-w-[425px] glass-strong">
          <form onSubmit={handleAddAmenity}>
            <DialogHeader>
              <DialogTitle>Add Custom {newAmenity.context === 'HOTEL' ? 'Hotel' : 'Room'} Amenity</DialogTitle>
              <DialogDescription>
                Create a custom feature specific to your property. Global defaults cannot be modified.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amenity-name">Amenity Name</Label>
                <Input 
                  id="amenity-name" 
                  placeholder="e.g. Private Beach Access"
                  value={newAmenity.name}
                  onChange={(e) => setNewAmenity(a => ({ ...a, name: e.target.value }))}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddAmenity(false)}>Cancel</Button>
              <Button type="submit" disabled={addingAmenity || !newAmenity.name.trim()}>
                {addingAmenity ? 'Adding...' : 'Add Amenity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
