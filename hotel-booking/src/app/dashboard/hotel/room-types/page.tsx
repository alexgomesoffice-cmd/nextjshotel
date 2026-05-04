'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Edit, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'
import Image from 'next/image'
import Link from 'next/link'

interface RoomTypeImage {
  id: number
  image_url: string
  is_cover: boolean
}

interface RoomType {
  id: number
  name: string
  description: string | null
  base_price: string
  room_size: string | null
  max_occupancy: number
  room_count: number
  type_images: RoomTypeImage[]
}

export default function RoomTypesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hotel-admin/room-types', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setRoomTypes(data.data)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load room types', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this room type? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/hotel-admin/room-types/${id}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Deleted', description: 'Room type removed', variant: 'success' })
        fetchData()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete room type', variant: 'destructive' })
    }
  }

  if (loading && roomTypes.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Room Types</h1>
          <p className="text-muted-foreground mt-1">Manage your room categories, pricing, and configurations.</p>
        </div>
        <Link href="/dashboard/hotel/room-types/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Room Type
          </Button>
        </Link>
      </div>

      {roomTypes.length === 0 ? (
        <Card className="glass-strong border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-xl font-bold mb-2">No Room Types Found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">Create your first room type to start adding physical rooms and receiving bookings.</p>
            <Link href="/dashboard/hotel/room-types/new">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Create Room Type
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomTypes.map((rt) => {
            const cover = rt.type_images.find(img => img.is_cover) || rt.type_images[0]
            return (
              <Card key={rt.id} className="overflow-hidden glass-strong flex flex-col hover:border-primary/50 transition-all duration-300">
                <div className="relative h-48 bg-muted">
                  {cover ? (
                    <Image src={cover.image_url} alt={rt.name} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                    BDT {rt.base_price} <span className="text-xs text-muted-foreground font-normal">/ night</span>
                  </div>
                </div>
                <CardContent className="p-5 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold">{rt.name}</h3>
                  <div className="flex gap-2 flex-wrap mt-2 mb-4">
                    <Badge variant="secondary">Up to {rt.max_occupancy} guests</Badge>
                    <Badge variant="outline">{rt.room_count} physical rooms</Badge>
                    {rt.room_size && <Badge variant="outline">{rt.room_size}</Badge>}
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {rt.description || 'No description provided.'}
                  </div>

                  <div className="mt-auto pt-4 flex gap-3 border-t">
                    <Link href={`/dashboard/hotel/room-types/${rt.id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2">
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                    </Link>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(rt.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
