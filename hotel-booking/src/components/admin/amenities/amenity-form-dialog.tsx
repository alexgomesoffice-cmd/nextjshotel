'use client'

import { useEffect, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { Search } from 'lucide-react'
import { AMENITY_ICON_NAMES } from '@/lib/amenity-icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface AmenityRecord {
  id: number
  name: string
  icon: string | null
  context: 'HOTEL' | 'ROOM'
}

export function AmenityIcon({ name, className }: { name?: string | null; className?: string }) {
  if (!name) return <LucideIcons.Sparkles className={className} />
  const Icon = (LucideIcons as any)[name] as React.ElementType 
  return Icon ? <Icon className={className} /> : <LucideIcons.Sparkles className={className} />
}

export function AmenityFormDialog({
  open,
  onOpenChange,
  context,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: 'HOTEL' | 'ROOM'
  editing: AmenityRecord | null
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string>('Sparkles')
  const [iconQuery, setIconQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [amenityContext, setAmenityContext] = useState<'HOTEL' | 'ROOM'>(context)

  useEffect(() => {
  if (open) {
    setName(editing?.name ?? '')
    setIcon(editing?.icon ?? 'Sparkles')
    setAmenityContext(editing?.context ?? context)
    setIconQuery('')
    setError(null)
  }
}, [open, editing, context])

  const filteredIcons = AMENITY_ICON_NAMES.filter((n) =>
    n.toLowerCase().includes(iconQuery.toLowerCase()),
  )

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const url = editing ? `/api/system-admin/amenities/${editing.id}` : '/api/system-admin/amenities'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon, context: amenityContext, is_active: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.message || 'Something went wrong.')
        return
      }
      onSaved()
      onOpenChange(false)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Amenity' : 'New Amenity'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
  <Label>Context</Label>
  <Tabs
    value={amenityContext}
    onValueChange={(value) =>
      setAmenityContext(value as 'HOTEL' | 'ROOM')
    }
  >
    <TabsList variant="line" className="w-full">
      <TabsTrigger
        value="HOTEL"
        className="flex-1 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
      >
        Hotel
      </TabsTrigger>
      <TabsTrigger
        value="ROOM"
        className="flex-1 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
      >
        Room
      </TabsTrigger>
    </TabsList>
  </Tabs>
</div>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="amenity-name">Name</Label>
            <Input
              id="amenity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Free Wi-Fi"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5">
              <AmenityIcon name={icon} className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{icon}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={iconQuery}
                onChange={(e) => setIconQuery(e.target.value)}
                placeholder="Search icons…"
                className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-7 pr-2 text-xs outline-none focus:border-primary/60"
              />
            </div>
            <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto rounded-md border border-border/40 p-1.5 custom-scrollbar"
                                    data-lenis-prevent="true"
                  data-lenis-prevent-wheel="true"
                  data-lenis-prevent-touch="true">
              {filteredIcons.map((n) => {
                const Icon = (LucideIcons as any)[n] as React.ElementType
                return (
                  <button
                    key={n}
                    type="button"
                    title={n}
                    onClick={() => setIcon(n)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-sm hover:bg-secondary',
                      icon === n && 'bg-primary/15 text-primary',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Amenity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}