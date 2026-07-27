'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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

export interface CityRecord {
  id: number
  name: string
  image_url: string | null
}

export function CityFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: CityRecord | null
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '')
      setImageUrl(editing?.image_url ?? null)
      setError(null)
    }
  }, [open, editing])

  const handleFile = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = reject
        r.readAsDataURL(file)
      })
      const res = await fetch('/api/system-admin/uploads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataUrl, filename: file.name, uploadSubDir: 'cities' }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.message || 'Upload failed.')
        return
      }
      setImageUrl(data.url)
    } catch {
      setError('Upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const url = editing ? `/api/system-admin/cities/${editing.id}` : '/api/system-admin/cities'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), image_url: imageUrl || '', is_active: true }),
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
          <DialogTitle>{editing ? 'Edit City' : 'New City'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="city-name">Name</Label>
            <Input
              id="city-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cox's Bazar"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Image</Label>
            {imageUrl && (
              <div className="relative h-28 w-full overflow-hidden rounded-md border border-border/60">
                <Image src={imageUrl} alt={name} fill className="object-cover" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
            />
            {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create City'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}