'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Upload, Star, Trash2, ImageIcon, Loader2 } from 'lucide-react'

export type ManagedImage = { id: number; image_url: string; is_cover: boolean }

/**
 * Generic image gallery — upload, delete, set cover. Parameterized by
 * endpoint so it works identically for Room Type images and Variant
 * images without duplicating the UI. `uploadUrl` accepts multipart POST
 * with a `files` field; `deleteUrl`/`coverUrl` take the image id.
 */
export const ImageManager = ({
  images, uploadUrl, deleteUrlFor, coverUrlFor, onChanged, disabled,
}: {
  images: ManagedImage[]
  uploadUrl: string
  deleteUrlFor: (imageId: number) => string
  coverUrlFor: (imageId: number) => string
  onChanged: () => void
  disabled?: boolean
}) => {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  const cover = images.find((i) => i.is_cover) ?? images[0]
  const rest = images.filter((i) => i.id !== cover?.id)

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f) => fd.append('files', f))
      const res = await fetch(uploadUrl, { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (data.success) {
        onChanged()
      } else {
        toast({ title: 'Upload failed', description: data.message, variant: 'destructive' })
      }
    } finally {
      setBusy(false)
    }
  }

  const remove = async (imageId: number) => {
    setBusy(true)
    try {
      const res = await fetch(deleteUrlFor(imageId), { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (data.success) onChanged()
      else toast({ title: 'Could not remove photo', description: data.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const setCover = async (imageId: number) => {
    setBusy(true)
    try {
      const res = await fetch(coverUrlFor(imageId), {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_cover: true }),
      })
      const data = await res.json()
      if (data.success) onChanged()
      else toast({ title: 'Could not set cover', description: data.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Cover */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-secondary/40">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.image_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute top-2 left-2 text-[10px] font-medium px-2 py-1 rounded-full bg-black/60 text-white">Cover</div>
            <button
              onClick={() => remove(cover.id)}
              disabled={disabled || busy}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <p className="text-xs">No cover image yet</p>
          </div>
        )}
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-4 gap-2">
        {rest.map((img) => (
          <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
              <button onClick={() => setCover(img.id)} disabled={disabled || busy} className="h-6 w-6 rounded-full bg-white/90 text-black flex items-center justify-center" title="Set as cover">
                <Star className="h-3 w-3" />
              </button>
              <button onClick={() => remove(img.id)} disabled={disabled || busy} className="h-6 w-6 rounded-full bg-white/90 text-destructive flex items-center justify-center" title="Remove">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        <label className={cn(
          'aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-emerald-500 cursor-pointer transition',
          (disabled || busy) && 'opacity-50 pointer-events-none',
        )}>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="text-[10px]">Add</span>
        </label>
      </div>
    </div>
  )
}