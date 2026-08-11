'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, DoorOpen, Hotel, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  BOOKED: 'border-blue-500/30 bg-blue-500/10 text-blue-600',
  CHECKED_IN: 'border-violet-500/30 bg-violet-500/10 text-violet-600',
  CHECKED_OUT: 'border-slate-500/30 bg-slate-500/10 text-slate-600',
  MAINTENANCE: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
}

const ROOM_STATUSES = [
  { value: 'AVAILABLE', label: 'Available', hint: 'Ready to sell' },
  { value: 'BOOKED', label: 'Booked', hint: 'Reserved for a guest' },
  { value: 'CHECKED_IN', label: 'Checked in', hint: 'Guest currently staying' },
  { value: 'CHECKED_OUT', label: 'Checked out', hint: 'Guest has departed' },
  { value: 'MAINTENANCE', label: 'Maintenance', hint: 'Temporarily unavailable' },
]

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

export default function VariantRoomPage() {
  const params = useParams<{ variantId: string; roomId: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [variant, setVariant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updatingRoomId, setUpdatingRoomId] = useState<number | null>(null)

  useEffect(() => {
    const loadVariant = async () => {
      try {
        const response = await fetch(`/api/hotel-admin/room-variants/${params.variantId}`, { credentials: 'include' })
        const result = await response.json()
        if (result.success) {
          setVariant(result.data)
        } else {
          toast({ title: 'Room variant not found', description: result.message, variant: 'destructive' })
          router.push('/dashboard/hotel/rooms')
        }
      } catch {
        toast({ title: 'Could not load room variant', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    loadVariant()
  }, [params.variantId, router, toast])

  const updateRoomStatus = async (roomId: number, status: string) => {
    setUpdatingRoomId(roomId)
    try {
      const response = await fetch(`/api/hotel-admin/rooms/${roomId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json()
      if (!result.success) {
        toast({ title: 'Could not update room status', description: result.message, variant: 'destructive' })
        return
      }

      setVariant((current: any) => current ? {
        ...current,
        room_details: current.room_details.map((room: any) => room.id === roomId ? { ...room, status } : room),
      } : current)
      toast({ title: 'Room status updated' })
    } catch {
      toast({ title: 'Could not update room status', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setUpdatingRoomId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!variant) return null

  const selectedRoom = variant.room_details.find((room: any) => String(room.id) === String(params.roomId))
  const availableRooms = variant.room_details.filter((room: any) => room.status === 'AVAILABLE').length

  return (
    <div className="min-h-full space-y-6 pb-8">
      <Link
        href={`/dashboard/hotel/rooms/${variant.room_type_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {variant.room_type?.name ?? 'room type'}
      </Link>

      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Room variant workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{variant.room_type?.name ?? 'Room configuration'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage the physical rooms that share this configuration and prepare their availability view.</p>
          </div>
          <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 text-primary">{variant.room_details.length} physical rooms</Badge>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="text-xs text-muted-foreground">Configuration</p>
            <p className="mt-1 font-medium">৳{Number(variant.price).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ night</span></p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="text-xs text-muted-foreground">Available now</p>
            <p className="mt-1 font-medium text-emerald-600">{availableRooms} rooms</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="text-xs text-muted-foreground">Selected room</p>
            <p className="mt-1 font-medium">{selectedRoom?.room_number ?? 'Not found'}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden border-border/70">
          <CardHeader className="border-b border-border/60 bg-secondary/15 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><DoorOpen className="h-4 w-4 text-primary" /> Physical rooms</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Manage the operational status of every room in this configuration.</p>
              </div>
              <Badge variant="outline" className="w-fit border-border/80 bg-background/60">{variant.room_details.length} rooms</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {variant.room_details.map((room: any) => {
              const isSelected = String(room.id) === String(params.roomId)
              const currentStatus = ROOM_STATUSES.find((status) => status.value === room.status)
              return (
                <div
                  key={room.id}
                  className={`flex flex-col gap-4 border-b border-border/60 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${isSelected ? 'bg-primary/5' : 'hover:bg-secondary/20'}`}
                >
                  <Link href={`/dashboard/hotel/rooms/variants/${variant.id}/rooms/${room.id}`} className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      <DoorOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">Room {room.room_number}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{room.floor ? `Floor ${room.floor}` : 'Floor not assigned'}</span>
                        <span className="text-border">•</span>
                        <span className="inline-flex items-center gap-1"><Hotel className="h-3 w-3" /> {room.room_size || 'Standard size'}</span>
                        {room.max_occupancy && <><span className="text-border">•</span><span>Up to {room.max_occupancy} guests</span></>}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-3 sm:shrink-0">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs font-medium">{currentStatus?.label ?? formatStatus(room.status)}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{currentStatus?.hint ?? 'Operational status'}</p>
                    </div>
                    <Select value={room.status} onValueChange={(status) => updateRoomStatus(room.id, status)} disabled={updatingRoomId === room.id}>
                      <SelectTrigger className={`h-9 w-full min-w-[150px] bg-background/70 sm:w-[170px] ${STATUS_STYLES[room.status] ?? ''}`} aria-label={`Change status for room ${room.room_number}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_STATUSES.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="h-fit border-border/70 bg-gradient-to-b from-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-primary/70" />
              <p className="mt-3 text-sm font-medium">Availability workspace ready</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Room-level dates, reservations, and maintenance blocks will appear here.</p>
            </div>
            {selectedRoom && (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Viewing room {selectedRoom.room_number}
              </div>
            )}
            <Button variant="outline" className="mt-4 w-full" disabled>Open availability calendar</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
