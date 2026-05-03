'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Sparkles, Plus, Trash2, Search, Building2, BedDouble, X, RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-hooks'

interface Amenity {
  id: number
  name: string
  icon: string | null
  context: 'HOTEL' | 'ROOM'
  is_active: boolean
  is_default: boolean
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function SystemAmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [contextFilter, setContextFilter] = useState<'all' | 'HOTEL' | 'ROOM'>('all')
  const { toast } = useToast()

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', icon: '', context: 'HOTEL' as 'HOTEL' | 'ROOM' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const fetchAmenities = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search) params.append('search', search)
      if (contextFilter !== 'all') params.append('context', contextFilter)

      const res = await fetch(`/api/system-admin/amenities?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setAmenities(data.data.amenities)
        setPagination(data.data.pagination)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load amenities', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, contextFilter, toast])

  useEffect(() => { fetchAmenities() }, [fetchAmenities])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Amenity name is required'
    if (form.name.length > 150) errors.name = 'Name must be under 150 characters'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/system-admin/amenities', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          icon: form.icon.trim() || undefined,
          context: form.context,
          is_active: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Global amenity created', variant: 'success' })
        setForm({ name: '', icon: '', context: 'HOTEL' })
        setShowForm(false)
        await fetchAmenities()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create amenity', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (amenity: Amenity) => {
    try {
      const res = await fetch(`/api/system-admin/amenities/${amenity.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !amenity.is_active }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Updated', description: `Amenity ${!amenity.is_active ? 'activated' : 'deactivated'}`, variant: 'success' })
        await fetchAmenities()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this amenity? If it's in use it will be deactivated instead.")) return
    try {
      setDeleteLoading(id)
      const res = await fetch(`/api/system-admin/amenities/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Done', description: data.message, variant: 'success' })
        await fetchAmenities()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    } finally {
      setDeleteLoading(null)
    }
  }

  const hotelAmenities = amenities.filter((a) => a.context === 'HOTEL')
  const roomAmenities = amenities.filter((a) => a.context === 'ROOM')

  const AmenityTable = ({ list }: { list: Amenity[] }) => (
    <div className="overflow-x-auto">
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
          <Sparkles className="h-10 w-10 mb-3 opacity-25" />
          <p className="font-medium">No amenities found</p>
          <p className="text-sm mt-1">Click &ldquo;Add Amenity&rdquo; to create a global default</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-10">#</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenity Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-44">Icon Key</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {list.map((amenity, idx) => (
              <tr
                key={amenity.id}
                className={`group transition-colors hover:bg-secondary/30 ${!amenity.is_active ? 'opacity-45' : ''}`}
              >
                {/* Index */}
                <td className="px-5 py-3.5 text-xs text-muted-foreground/50 tabular-nums">{idx + 1}</td>

                {/* Amenity name — full width, always readable */}
                <td className="px-5 py-3.5">
                  <span className="font-semibold text-foreground text-base leading-tight">
                    {amenity.name}
                  </span>
                </td>

                {/* Icon field shown as a code snippet — separate column, not mixed with name */}
                <td className="px-5 py-3.5">
                  {amenity.icon ? (
                    <code className="rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-xs font-mono text-muted-foreground">
                      {amenity.icon}
                    </code>
                  ) : (
                    <span className="text-muted-foreground/30 text-xs">—</span>
                  )}
                </td>

                {/* Status badge */}
                <td className="px-5 py-3.5">
                  <Badge
                    variant="outline"
                    className={amenity.is_active
                      ? 'bg-green-500/15 text-green-600 border-green-500/30 font-medium'
                      : 'bg-gray-500/15 text-gray-500 border-gray-500/30 font-medium'}
                  >
                    {amenity.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleToggleActive(amenity)}
                      title={amenity.is_active ? 'Deactivate' : 'Activate'}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleDelete(amenity.id)}
                      disabled={deleteLoading === amenity.id}
                      title="Delete amenity"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Global Amenities</h1>
          <p className="text-muted-foreground mt-1">Platform-wide default amenities visible to all hotels</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Amenity'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="glass-strong animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> New Global Amenity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="amenity-name">
                  Amenity Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amenity-name"
                  placeholder="e.g. Swimming Pool, Free Wi-Fi, Gym"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={formErrors.name ? 'border-destructive' : ''}
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amenity-icon">Icon Key <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="amenity-icon"
                  placeholder="e.g. 🏊 or wifi, pool"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Use an emoji or a short text key</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amenity-context">
                  Context <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.context}
                  onValueChange={(v: 'HOTEL' | 'ROOM') => setForm((f) => ({ ...f, context: v }))}
                >
                  <SelectTrigger id="amenity-context"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOTEL">🏨 Hotel (property-level)</SelectItem>
                    <SelectItem value="ROOM">🛏️ Room (room-level)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4 flex justify-end pt-1">
                <Button type="submit" disabled={submitting} className="min-w-36">
                  {submitting ? 'Creating...' : 'Create Amenity'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search + Filter */}
      <Card className="glass-strong">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search amenities by name..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Select
              value={contextFilter}
              onValueChange={(v: 'all' | 'HOTEL' | 'ROOM') => {
                setContextFilter(v)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
            >
              <SelectTrigger className="h-10"><SelectValue placeholder="Filter by context" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contexts</SelectItem>
                <SelectItem value="HOTEL">Hotel Amenities</SelectItem>
                <SelectItem value="ROOM">Room Amenities</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs — Hotel vs Room */}
      <Tabs defaultValue="hotel" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="hotel" className="gap-2">
            <Building2 className="h-4 w-4" />
            Hotel Amenities
            <Badge variant="outline" className="ml-1 tabular-nums">{hotelAmenities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="room" className="gap-2">
            <BedDouble className="h-4 w-4" />
            Room Amenities
            <Badge variant="outline" className="ml-1 tabular-nums">{roomAmenities.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hotel">
          <Card className="glass-strong overflow-hidden">
            {loading ? (
              <CardContent className="pt-5 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </CardContent>
            ) : (
              <AmenityTable list={hotelAmenities} />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="room">
          <Card className="glass-strong overflow-hidden">
            {loading ? (
              <CardContent className="pt-5 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </CardContent>
            ) : (
              <AmenityTable list={roomAmenities} />
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
