'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, BedDouble, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { RoomTypeCard } from './room-type-card'
import { RoomTypeFormDialog, RoomTypeSummary } from './room-type-form-dialog'

type RoomTypeListItem = RoomTypeSummary & { variant_count: number; room_count: number; starting_price: number | null }

/**
 * Main Rooms page content — Room Types only. No tabs, no nested Variants
 * or Physical Rooms here (those load on the dedicated Room Type page,
 * /dashboard/hotel/rooms/[id], once the Hotel Admin drills in).
 */
export const RoomTypesSection = () => {
  const { toast } = useToast()
  const [roomTypes, setRoomTypes] = useState<RoomTypeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const [createOpen, setCreateOpen] = useState(false)
  const [editType, setEditType] = useState<RoomTypeListItem | null>(null)
  const [imageType, setImageType] = useState<RoomTypeListItem | null>(null)

  const fetchRoomTypes = useCallback(async () => {
    const res = await fetch('/api/hotel-admin/room-types', { credentials: 'include' })
    const data = await res.json()
    if (data.success) setRoomTypes(data.data)
    setLoading(false)
  }, [])

  const deleteRoomType = useCallback(async (id: number) => {
    if (!window.confirm('Delete this room type? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/hotel-admin/room-types/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: 'Room type deleted' })
        await fetchRoomTypes()
      } else {
        toast({ title: 'Could not delete room type', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Could not delete room type', description: 'Failed to delete room type', variant: 'destructive' })
    }
  }, [fetchRoomTypes, toast])

  const toggleRoomType = useCallback(async (id: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/hotel-admin/room-types/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: 'Could not update room type status', description: data.message, variant: 'destructive' })
        return
      }
      setRoomTypes((current) => current.map((roomType) => roomType.id === id ? { ...roomType, is_active: isActive } : roomType))
      toast({ title: isActive ? 'Room type activated' : 'Room type deactivated' })
    } catch {
      toast({ title: 'Could not update room type status', description: 'Please try again.', variant: 'destructive' })
    }
  }, [toast])

  useEffect(() => { fetchRoomTypes() }, [fetchRoomTypes])

  const filtered = useMemo(() => {
    return roomTypes.filter((rt) => {
      const q = search.trim().toLowerCase()
      if (q && !rt.name.toLowerCase().includes(q)) return false
      if (statusFilter === 'ACTIVE' && !rt.is_active) return false
      if (statusFilter === 'INACTIVE' && rt.is_active) return false
      return true
    })
  }, [roomTypes, search, statusFilter])

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}><CardContent className="p-4 flex gap-4">
            <Skeleton className="w-36 h-36 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-8 w-full mt-4" />
            </div>
          </CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search room types…" className="pl-9" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="text-sm rounded-lg border border-border bg-background px-3 py-2"
        >
          <option value="ALL">All</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Room Type
        </Button>
      </div>

      {roomTypes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto">
              <BedDouble className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-medium">No room types yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Create your first room type to start adding rooms.</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Room Type</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No room types match your search.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((rt) => (
            <RoomTypeCard key={rt.id} roomType={rt} onEdit={() => setEditType(rt)} onManageImages={() => setImageType(rt)} onDelete={() => deleteRoomType(rt.id)} onToggleActive={(isActive) => void toggleRoomType(rt.id, isActive)} />
          ))}
        </div>
      )}

      <RoomTypeFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={fetchRoomTypes} />
      <RoomTypeFormDialog open={!!editType} onOpenChange={(v) => !v && setEditType(null)} existing={editType} onSaved={fetchRoomTypes} />
      <RoomTypeFormDialog open={!!imageType} onOpenChange={(v) => !v && setImageType(null)} existing={imageType} defaultTab="images" onSaved={fetchRoomTypes} />
    </div>
  )
}