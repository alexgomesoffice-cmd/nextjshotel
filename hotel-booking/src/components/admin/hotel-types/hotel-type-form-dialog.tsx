'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export interface HotelTypeRecord { id: number; name: string; image_url?: string | null }

interface HotelTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: HotelTypeRecord | null
  onSaved: () => void
}

export function HotelTypeFormDialog(props: HotelTypeFormDialogProps) {
  return (
    <HotelTypeFormDialogContent
      key={`${props.open}-${props.editing?.id ?? 'new'}`}
      {...props}
    />
  )
}

function HotelTypeFormDialogContent({
  open, onOpenChange, editing, onSaved,
}: HotelTypeFormDialogProps) {
  const [name, setName] = useState(editing?.name ?? '')
  const [imageUrl, setImageUrl] = useState<string | null>(editing?.image_url ?? null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(editing?.image_url ?? null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [savedRecord, setSavedRecord] = useState<HotelTypeRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      setError('Image must be 1 MB or smaller.')
      event.target.value = ''
      return
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Only PNG, JPEG, and WEBP images are supported.')
      event.target.value = ''
      return
    }

    setError(null)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setRemoveImage(false)
  }

  const handleDeleteImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoveImage(Boolean(imageUrl))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)

    const activeRecord = editing ?? savedRecord
    let hotelTypeId: number
    let detailsSaved = false
    try {
      const url = activeRecord ? `/api/system-admin/hotel-types/${activeRecord.id}` : '/api/system-admin/hotel-types'
      const method = activeRecord ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), is_active: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.message || 'Something went wrong.'); return }

      hotelTypeId = data.data.id
      detailsSaved = true
      if (!activeRecord) setSavedRecord(data.data)

      if (selectedFile) {
        const formData = new FormData()
        formData.append('image', selectedFile)
        const imageResponse = await fetch(`/api/system-admin/hotel-types/${hotelTypeId}/image`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        const imageData = await imageResponse.json()
        if (!imageResponse.ok || !imageData.success) {
          onSaved()
          setError(`Hotel type details were saved, but the image was not uploaded. ${imageData.message || 'Please try again.'}`)
          return
        }
        setImageUrl(imageData.data.image_url)
        setPreviewUrl(imageData.data.image_url)
        setSelectedFile(null)
        setRemoveImage(false)
      } else if (removeImage) {
        const imageResponse = await fetch(`/api/system-admin/hotel-types/${hotelTypeId}/image`, {
          method: 'DELETE',
          credentials: 'include',
        })
        const imageData = await imageResponse.json()
        if (!imageResponse.ok || !imageData.success) {
          onSaved()
          setError(`Hotel type details were saved, but the image was not deleted. ${imageData.message || 'Please try again.'}`)
          return
        }
        setImageUrl(null)
        setPreviewUrl(null)
        setRemoveImage(false)
      }

      onSaved()
      onOpenChange(false)
    } catch {
      if (detailsSaved) onSaved()
      setError(detailsSaved
        ? 'Hotel type details were saved, but the image update could not be completed. Please try again.'
        : 'Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{editing || savedRecord ? 'Edit Hotel Type' : 'New Hotel Type'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="hotel-type-name">Name</Label>
            <Input id="hotel-type-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Resort" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Default Image</Label>
            {previewUrl && !removeImage ? (
              <div className="relative h-36 overflow-hidden rounded-md border">
                <Image src={previewUrl} alt={`${name || 'Hotel type'} default image preview`} fill unoptimized className="object-cover" />
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed bg-muted/30 text-center">
                <div>
                  <p className="text-sm font-medium">No default image</p>
                  <p className="text-xs text-muted-foreground">Upload an image to represent this hotel type.</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                <ImagePlus className="h-3.5 w-3.5" />
                {previewUrl && !removeImage ? 'Replace Image' : 'Upload Image'}
              </Button>
              {(imageUrl || selectedFile) && !removeImage && (
                <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleDeleteImage} disabled={saving}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
              <span className="text-[11px] text-muted-foreground">PNG, JPEG, or WEBP · max 1 MB</span>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing || savedRecord ? 'Save Changes' : 'Create Hotel Type'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}