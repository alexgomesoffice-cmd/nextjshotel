'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UploadCloud, Star, Trash2, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'
import Image from 'next/image'

interface HotelImage {
  id: number
  image_url: string
  is_cover: boolean
  sort_order: number
}

export default function HotelImagesPage() {
  const [images, setImages] = useState<HotelImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hotel-admin/hotel/images', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setImages(data.data)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load images', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    // Automatically set as cover if it's the first ever image
    if (images.length === 0) {
      formData.append('set_as_cover', 'true')
    }

    try {
      setUploading(true)
      const res = await fetch('/api/hotel-admin/hotel/images', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: 'Success', description: 'Images uploaded successfully', variant: 'success' })
        fetchImages()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to upload images', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      const res = await fetch(`/api/hotel-admin/hotel/images/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: 'Deleted', description: 'Image has been removed', variant: 'success' })
        fetchImages()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete image', variant: 'destructive' })
    }
  }

  const handleSetCover = async (id: number) => {
    try {
      const res = await fetch(`/api/hotel-admin/hotel/images/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_cover: true })
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: 'Updated', description: 'Cover image updated', variant: 'success' })
        fetchImages()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update cover', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hotel Gallery</h1>
          <p className="text-muted-foreground mt-1">Upload and manage high-quality photos of your property.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            multiple 
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload Images'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl w-full" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <Card className="glass-strong border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <ImageIcon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No images uploaded yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Properties with at least 5 high-quality photos get significantly more bookings.
            </p>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
              <UploadCloud className="h-4 w-4" /> Browse Files
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((img) => (
            <div 
              key={img.id} 
              className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                img.is_cover ? 'border-primary shadow-glow shadow-primary/20 scale-[1.02]' : 'border-transparent hover:border-primary/50'
              }`}
            >
              <Image 
                src={img.image_url} 
                alt="Hotel Photo" 
                fill 
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                <div className="flex justify-end">
                  <button 
                    onClick={() => handleDelete(img.id)}
                    className="p-1.5 bg-destructive/90 text-white rounded-md hover:bg-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {!img.is_cover && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full gap-2 bg-background/90 hover:bg-background"
                    onClick={() => handleSetCover(img.id)}
                  >
                    <Star className="h-3.5 w-3.5" /> Set as Cover
                  </Button>
                )}
              </div>

              {/* Cover Badge */}
              {img.is_cover && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shadow-sm flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" /> Cover Photo
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
