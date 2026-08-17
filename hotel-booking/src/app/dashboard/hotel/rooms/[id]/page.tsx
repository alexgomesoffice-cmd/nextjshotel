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
import { cn } from '@/lib/utils'

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

  const deleteVariant = async (variantId: number) => {
    if (!window.confirm('Delete this room variant? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/hotel-admin/room-variants/${variantId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: 'Room variant deleted' })
        await fetchRoomType()
      } else {
        toast({ title: 'Could not delete room variant', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Could not delete room variant', description: 'Failed to delete room variant', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!roomType) return null

  const allRooms = roomType.room_variants.flatMap((v: any) => v.room_details)
  const coverImage = roomType.type_images?.find((i: any) => i.is_cover) ?? roomType.type_images?.[0]

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
      {/* Navigation */}
      <div>
        <Link href="/dashboard/hotel/rooms" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Hotel Room Types
        </Link>
      </div>

      {/* Header Overview Card */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-5 min-w-0 flex-1">
          {coverImage ? (
            <div className="relative w-44 sm:w-56 h-36 shrink-0 rounded-lg overflow-hidden border border-border/60 bg-secondary/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{roomType.name}</h1>
              <Badge variant="outline" className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5', roomType.is_active ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-muted text-muted-foreground')}>
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', roomType.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                {roomType.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {roomType.hotel?.name && (
              <p className="text-xs font-medium text-muted-foreground">{roomType.hotel.name}</p>
            )}

            {roomType.description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{roomType.description}</p>
            )}

            <div className="flex items-center gap-3 pt-1 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" /> {roomType.room_variants.length} Variant{roomType.room_variants.length === 1 ? '' : 's'}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <DoorOpen className="h-3.5 w-3.5 text-primary" /> {allRooms.length} Physical Room{allRooms.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <Button variant="outline" size="sm" className="h-9 text-xs font-semibold" onClick={() => setImagesOpen(true)}>
            <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Manage Images
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs font-semibold" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Room Type
          </Button>
          <Button size="sm" className="h-9 text-xs font-semibold" onClick={() => setAddRoomOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Room
          </Button>
        </div>
      </div>

      {/* Room Variants Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Room Variants</h2>
            <p className="text-xs text-muted-foreground">Configurations available for this room type</p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" onClick={() => setAddRoomOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Room
          </Button>
        </div>

        {roomType.room_variants.length === 0 ? (
          <Card className="border border-dashed border-border/80 bg-card">
            <CardContent className="py-12 text-center">
              <DoorOpen className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No room variants yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Add a physical room to automatically create the first configuration.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setAddRoomOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {roomType.room_variants.map((v: any) => (
              <VariantCard
                key={v.id}
                variant={v}
                onEditRoom={(roomId) => setEditRoomId(roomId)}
                onChangeStatus={changeStatus}
                onAddRoom={() => setAddRoomOpen(true)}
                onChanged={fetchRoomType}
                onDelete={() => deleteVariant(v.id)}
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