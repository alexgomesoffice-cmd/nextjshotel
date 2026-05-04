'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, BedDouble } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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

interface BedType {
  id: number
  name: string
  is_default: boolean
  hotel_id: number | null
  is_active: boolean
}

export default function BedTypesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [bedTypes, setBedTypes] = useState<BedType[]>([])

  const [showAddBed, setShowAddBed] = useState(false)
  const [newBedName, setNewBedName] = useState('')
  const [addingBed, setAddingBed] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hotel-admin/bed-types', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setBedTypes(data.data)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load bed types', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBedName.trim()) return

    try {
      setAddingBed(true)
      const res = await fetch('/api/hotel-admin/bed-types', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBedName })
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: 'Success', description: 'Bed type added successfully', variant: 'success' })
        setShowAddBed(false)
        setNewBedName('')
        fetchData()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add bed type', variant: 'destructive' })
    } finally {
      setAddingBed(false)
    }
  }

  const handleDeleteBed = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom bed type?')) return
    try {
      const res = await fetch(`/api/hotel-admin/bed-types/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Bed type deleted', variant: 'success' })
        fetchData()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete bed type', variant: 'destructive' })
    }
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bed Types</h1>
          <p className="text-muted-foreground mt-1">Manage global defaults and add your own custom bed configurations.</p>
        </div>
        <Button onClick={() => setShowAddBed(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Custom Bed Type
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {bedTypes.map((item) => (
          <div 
            key={item.id} 
            className={`flex items-center justify-between p-4 rounded-xl border ${item.is_default ? 'bg-secondary/20 border-border/50' : 'bg-primary/5 border-primary/20'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.is_default ? 'bg-secondary' : 'bg-primary/10 text-primary'}`}>
                <BedDouble className="h-4 w-4" />
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
                onClick={() => handleDeleteBed(item.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {bedTypes.length === 0 && (
          <div className="col-span-full p-8 text-center border border-dashed rounded-xl border-border">
            <p className="text-muted-foreground">No bed types found.</p>
          </div>
        )}
      </div>

      <Dialog open={showAddBed} onOpenChange={setShowAddBed}>
        <DialogContent className="sm:max-w-[425px] glass-strong">
          <form onSubmit={handleAddBed}>
            <DialogHeader>
              <DialogTitle>Add Custom Bed Type</DialogTitle>
              <DialogDescription>
                Create a custom bed configuration if standard options don't fit.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bed-name">Bed Type Name</Label>
                <Input 
                  id="bed-name" 
                  placeholder="e.g. Round King Bed"
                  value={newBedName}
                  onChange={(e) => setNewBedName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddBed(false)}>Cancel</Button>
              <Button type="submit" disabled={addingBed || !newBedName.trim()}>
                {addingBed ? 'Adding...' : 'Add Bed Type'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
