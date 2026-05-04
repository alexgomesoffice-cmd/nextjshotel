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

  const [showAddAmenity, setShowAddAmenity] = useState(false)
  const [newAmenity, setNewAmenity] = useState({ name: '', icon: 'CheckCircle2', context: 'HOTEL' as 'HOTEL'|'ROOM' })
  const [addingAmenity, setAddingAmenity] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [amRes, selRes] = await Promise.all([
        fetch('/api/hotel-admin/amenities', { credentials: 'include' }),
        fetch('/api/hotel-admin/amenities/selection', { credentials: 'include' })
      ])
      
      const amData = await amRes.json()
      const selData = await selRes.json()

      if (amData.success) setAmenities(amData.data)
      if (selData.success) setSelectedIds(selData.data)
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
        setSelectedIds(prev => prev.filter(p => p !== id))
        fetchData()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete amenity', variant: 'destructive' })
    }
  }

  const handleToggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleSaveSelection = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/hotel-admin/amenities/selection', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amenityIds: selectedIds })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Amenities updated', variant: 'success' })
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save amenities', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const AmenityGrid = ({ items, context }: { items: Amenity[], context: 'HOTEL'|'ROOM' }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id)
        return (
          <div 
            key={item.id} 
            onClick={() => context === 'HOTEL' && handleToggleSelection(item.id)}
            className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
              isSelected 
                ? 'bg-primary/10 border-primary ring-1 ring-primary' 
                : 'bg-card border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Disc Selection UI */}
              {context === 'HOTEL' && (
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30 group-hover:border-primary/50'
                }`}>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                </div>
              )}
              
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                {item.context === 'HOTEL' ? <Hotel className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
              </div>
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <Badge variant="outline" className={`mt-1 text-[10px] px-1.5 py-0 border-none ${item.is_default ? 'bg-secondary text-muted-foreground' : 'bg-primary/20 text-primary'}`}>
                  {item.is_default ? 'Global' : 'Custom'}
                </Badge>
              </div>
            </div>
            {!item.is_default && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteAmenity(item.id); }}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )
      })}
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
    <div className="space-y-6 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 -mx-6 px-6 lg:-mx-8 lg:px-8 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Amenities & Features</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Select the amenities your hotel provides and manage your custom features.</p>
          </div>
          <Button 
            onClick={handleSaveSelection} 
            disabled={saving} 
            className="w-full sm:w-auto shadow-lg"
          >
            {saving ? 'Saving...' : 'Save Selection'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex h-12 items-center justify-start rounded-none bg-transparent p-0 w-full">
            <TabsTrigger 
              value="hotel"
              className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-6 pb-3 pt-2 font-medium text-muted-foreground transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <Hotel className="w-4 h-4" />
                <span>Hotel Amenities</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="room"
              className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-6 pb-3 pt-2 font-medium text-muted-foreground transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4" />
                <span>Room Amenities</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-6">
        {activeTab === 'hotel' ? (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Features that apply to your entire property (e.g. Pool, Gym).</p>
              <Button size="sm" variant="outline" onClick={() => { setNewAmenity({ ...newAmenity, context: 'HOTEL' }); setShowAddAmenity(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Custom Hotel Amenity
              </Button>
            </div>
            <AmenityGrid items={amenities.HOTEL} context="HOTEL" />
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Features that apply to specific room types (e.g. Balcony, Sea View).</p>
              <Button size="sm" variant="outline" onClick={() => { setNewAmenity({ ...newAmenity, context: 'ROOM' }); setShowAddAmenity(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Custom Room Amenity
              </Button>
            </div>
            <AmenityGrid items={amenities.ROOM} context="ROOM" />
          </div>
        )}
      </div>

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
