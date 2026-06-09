'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Bed,
  Layers,
  DollarSign
} from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface RoomType {
  id: number
  name: string
  base_price: string
}

interface Room {
  id: number
  room_type_id: number
  room_number: string
  floor: number
  price: string
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE'
  ac: boolean
  smoking_allowed: boolean
  pet_allowed: boolean
  notes: string | null
  room_type: {
    name: string
  }
  room_images?: { image_url: string }[]
}

export default function HotelRoomsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hotel-admin/rooms', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setRooms(data.data)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch rooms', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchRoomTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/hotel-admin/room-types', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setRoomTypes(data.data)
    } catch (error) {
      console.error('Failed to fetch room types')
    }
  }, [])

  useEffect(() => {
    fetchRooms()
    fetchRoomTypes()
  }, [fetchRooms, fetchRoomTypes])

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || room.status === statusFilter
    const matchesType = typeFilter === 'ALL' || room.room_type_id.toString() === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const handleOpenAdd = () => {
    router.push('/dashboard/hotel/rooms/new')
  }

  const handleOpenEdit = (id: number) => {
    router.push(`/dashboard/hotel/rooms/${id}`)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this room?')) return

    try {
      const res = await fetch(`/api/hotel-admin/rooms/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Room deleted', variant: 'success' })
        fetchRooms()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete room', variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: Room['status']) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3" /> Available</Badge>
      case 'UNAVAILABLE': return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Occupied</Badge>
      case 'MAINTENANCE': return <Badge variant="secondary" className="gap-1"><Wrench className="w-3 h-3" /> Maintenance</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your physical room instances and their statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenAdd} className="gap-2 shadow-lg">
            <Plus className="w-4 h-4" /> Add Room
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-strong">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rooms</p>
                <h3 className="text-2xl font-bold">{rooms.length}</h3>
              </div>
              <Bed className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <h3 className="text-2xl font-bold text-green-500">
                  {rooms.filter(r => r.status === 'AVAILABLE').length}
                </h3>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Occupied</p>
                <h3 className="text-2xl font-bold text-red-500">
                  {rooms.filter(r => r.status === 'UNAVAILABLE').length}
                </h3>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Maintenance</p>
                <h3 className="text-2xl font-bold text-yellow-500">
                  {rooms.filter(r => r.status === 'MAINTENANCE').length}
                </h3>
              </div>
              <Wrench className="w-8 h-8 text-yellow-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <Card className="glass-strong">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by room number..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Room Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Room Types</SelectItem>
                {roomTypes.map(type => (
                  <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="UNAVAILABLE">Occupied</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-bold w-[80px]">Image</TableHead>
              <TableHead className="font-bold">Room No.</TableHead>
              <TableHead className="font-bold">Room Type</TableHead>
              <TableHead className="font-bold">Floor</TableHead>
              <TableHead className="font-bold">Price / Night</TableHead>
              <TableHead className="font-bold">Facilities</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredRooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic">
                  No rooms found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredRooms.map((room) => (
                <TableRow key={room.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="w-12 h-12 rounded-lg overflow-hidden border bg-muted/20">
                      {room.room_images?.[0] ? (
                        <img
                          src={room.room_images[0].image_url}
                          alt={room.room_number}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <Bed className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-primary">{room.room_number}</TableCell>
                  <TableCell>{room.room_type.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{room.floor}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-green-500" />
                      <span>{parseFloat(room.price).toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {room.ac && <Badge variant="secondary" className="px-1.5 py-0">AC</Badge>}
                      {room.smoking_allowed && <Badge variant="secondary" className="px-1.5 py-0">Smoking</Badge>}
                      {room.pet_allowed && <Badge variant="secondary" className="px-1.5 py-0">Pets</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(room.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] glass-strong">
                        <DropdownMenuItem onClick={() => handleOpenEdit(room.id)} className="gap-2">
                          <Edit className="w-4 h-4" /> Edit Room
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(room.id)} className="gap-2 text-destructive">
                          <Trash2 className="w-4 h-4" /> Delete Room
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
