'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bed, Search, ChevronLeft, ChevronRight,
  CheckCircle2, Wrench, XCircle, RefreshCw, Plus, Pencil
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'
import { cn } from '@/lib/utils'

interface Room {
  id: number
  room_number: string
  floor: number | null
  price: number
  ac: boolean
  smoking_allowed: boolean
  pet_allowed: boolean
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE'
  room_type: { id: number; name: string }
}

const STATUS_CONFIG = {
  AVAILABLE:   { label: 'Available',   badge: 'bg-green-500/20 text-green-700 border-green-500/30', icon: CheckCircle2 },
  UNAVAILABLE: { label: 'Unavailable', badge: 'bg-gray-500/20  text-gray-600  border-gray-500/30',  icon: XCircle      },
  MAINTENANCE: { label: 'Maintenance', badge: 'bg-amber-500/20 text-amber-700 border-amber-500/30', icon: Wrench       },
}

export default function SubAdminRoomsPage() {
  const { toast } = useToast()
  const [rooms, setRooms]     = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('all')
  const [page, setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]     = useState(0)

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '15' })
      if (search) params.append('search', search)
      if (status !== 'all') params.append('status', status)

      const res  = await fetch(`/api/hotel-admin/rooms?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setRooms(data.data.rooms ?? data.data)
        setTotalPages(data.data.pagination?.totalPages ?? 1)
        setTotal(data.data.pagination?.total ?? (data.data.rooms ?? data.data).length)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load rooms', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, status, toast])

  useEffect(() => {
    void (async () => { await fetchRooms() })()
  }, [fetchRooms])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rooms</h1>
          <p className="text-muted-foreground mt-1">{total} rooms total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRooms} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Link href="/dashboard/sub/rooms/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New Room
            </Button>
          </Link>
        </div>
      </div>

      <Card className="glass-strong">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search room number..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-10 h-10"
              />
            </div>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead>Room No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Price/Night</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}</TableRow>
                ))
              ) : rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <Bed className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No rooms found</p>
                  </TableCell>
                </TableRow>
              ) : rooms.map(room => {
                const cfg  = STATUS_CONFIG[room.status]
                const Icon = cfg.icon
                return (
                  <TableRow key={room.id} className="hover:bg-secondary/30">
                    <TableCell className="font-semibold">{room.room_number}</TableCell>
                    <TableCell className="text-sm">{room.room_type.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {room.floor != null ? `Floor ${room.floor}` : '—'}
                    </TableCell>
                    <TableCell className="font-medium">৳{Number(room.price).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {room.ac && <span className="text-xs bg-blue-500/10 text-blue-700 border border-blue-500/20 rounded-full px-2 py-0.5">AC</span>}
                        {room.smoking_allowed && <span className="text-xs bg-secondary rounded-full px-2 py-0.5 text-muted-foreground">Smoking</span>}
                        {room.pet_allowed && <span className="text-xs bg-secondary rounded-full px-2 py-0.5 text-muted-foreground">Pets</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <Badge variant="outline" className={cn('text-xs', cfg.badge)}>{cfg.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/sub/rooms/${room.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit room">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <Card className="glass-strong">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
