'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, Pencil, ImageIcon, Plus, Layers, DoorOpen } from 'lucide-react'
import { RoomTypeFormDialog } from '@/components/hotel-admin/rooms/room-type-form-dialog'
import { VariantCard } from '@/components/hotel-admin/rooms/variant-card'
import { RoomFormDialog } from '@/components/hotel-admin/rooms/room-form-dialog'
import { RoomEditDialog } from '@/components/hotel-admin/rooms/room-edit-dialog'

export default function RoomTypeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const roomTypeId = Number(params.id)

  const [roomType, setRoomType] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [imagesOpen, setImagesOpen] = useState(false)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [editRoomId, setEditRoomId] = useState<number | null>(null)

  const fetchRoomType = useCallback(async () => {
    const res = await fetch(`/api/hotel-admin/room-types/${roomTypeId}`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) setRoomType(data.data)
    else {
      toast({ title: 'Room type not found', variant: 'destructive' })
      router.push('/dashboard/hotel/rooms')
    }
    setLoading(false)
  }, [roomTypeId, router, toast])

  useEffect(() => { fetchRoomType() }, [fetchRoomType])

  const changeStatus = async (roomId: number, status: string) => {
    const res = await fetch(`/api/hotel-admin/rooms/${roomId}/status`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (data.success) { toast({ title: 'Status updated' }); fetchRoomType() }
    else toast({ title: 'Could not update status', description: data.message, variant: 'destructive' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!roomType) return null

  const allRooms = roomType.room_variants.flatMap((v: any) => v.room_details)

  return (
    <div className="space-y-6">
      <Link href="/dashboard/hotel/rooms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Rooms
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{roomType.name}</h1>
            <Badge variant={roomType.is_active ? 'default' : 'secondary'}>{roomType.is_active ? 'Active' : 'Inactive'}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">{roomType.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {roomType.room_variants.length} configuration{roomType.room_variants.length === 1 ? '' : 's'}</span>
            <span className="inline-flex items-center gap-1"><DoorOpen className="h-3.5 w-3.5" /> {allRooms.length} room{allRooms.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setImagesOpen(true)}><ImageIcon className="h-3.5 w-3.5 mr-2" /> Manage Images</Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit Room Type</Button>
          <Button size="sm" onClick={() => setAddRoomOpen(true)}><Plus className="h-3.5 w-3.5 mr-2" /> Add Room</Button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold">Room Variants</h2>
        <p className="text-xs text-muted-foreground mb-3">Configurations of this room type are grouped below.</p>

        {roomType.room_variants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DoorOpen className="h-6 w-6 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium mt-2">No room configurations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create a physical room to automatically create the first configuration.</p>
              <Button size="sm" className="mt-3" onClick={() => setAddRoomOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Room</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {roomType.room_variants.map((v: any) => (
              <VariantCard
                key={v.id}
                variant={v}
                onEditRoom={(roomId) => setEditRoomId(roomId)}
                onChangeStatus={changeStatus}
                onAddRoom={() => setAddRoomOpen(true)}
                onChanged={fetchRoomType}
              />
            ))}
          </div>
        )}
      </div>

      <RoomTypeFormDialog open={editOpen} onOpenChange={setEditOpen} existing={roomType} onSaved={fetchRoomType} />
      <RoomTypeFormDialog open={imagesOpen} onOpenChange={setImagesOpen} existing={roomType} defaultTab="images" onSaved={fetchRoomType} />
      <RoomFormDialog open={addRoomOpen} onOpenChange={setAddRoomOpen} roomTypeId={roomTypeId} existingVariants={roomType.room_variants} onCreated={fetchRoomType} />
      <RoomEditDialog open={!!editRoomId} onOpenChange={(v) => !v && setEditRoomId(null)} roomId={editRoomId} onSaved={fetchRoomType} />
    </div>
  )
}