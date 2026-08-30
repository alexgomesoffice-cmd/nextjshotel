"use client"

import { useState, useRef, FormEvent } from "react"
import { GripVertical, Image as ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface HeroBanner {
  id: number
  slot: number
  image_url: string | null
  eyebrow: string | null
  title: string | null
  description: string | null
  is_active: boolean
}

interface Props {
  banner: HeroBanner
  onSave: (id: number, formData: FormData) => Promise<void>
  onToggleActive: (id: number, isActive: boolean) => Promise<void>
  onDragStart: (e: React.DragEvent, id: number) => void
  onDragOver: (e: React.DragEvent, id: number, position: "top" | "bottom") => void
  onDrop: (e: React.DragEvent, id: number, position: "top" | "bottom") => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
  dragPosition: "top" | "bottom" | null
}

export function HeroBannerCard({
  banner,
  onSave,
  onToggleActive,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
  dragPosition
}: Props) {
  const [eyebrow, setEyebrow] = useState(banner.eyebrow || "")
  const [title, setTitle] = useState(banner.title || "")
  const [description, setDescription] = useState(banner.description || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(banner.image_url)
  const [removeImage, setRemoveImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Image must be 1 MB or smaller.")
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setRemoveImage(false)
    }
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoveImage(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const formData = new FormData()
      formData.append("eyebrow", eyebrow)
      formData.append("title", title)
      formData.append("description", description)
      
      if (selectedFile) {
        formData.append("image", selectedFile)
      } else if (removeImage) {
        formData.append("remove_image", "true")
      }
      
      await onSave(banner.id, formData)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDragOverLocal = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? "top" : "bottom"
    onDragOver(e, banner.id, position)
  }

  const handleDropLocal = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? "top" : "bottom"
    onDrop(e, banner.id, position)
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card text-card-foreground shadow-xs transition-all duration-200",
        isDragging && "opacity-50 scale-[0.98]"
      )}
      onDragOver={handleDragOverLocal}
      onDrop={handleDropLocal}
      onDragEnter={(e) => e.preventDefault()}
    >
      {/* Insertion Indicators */}
      {isDragOver && dragPosition === "top" && (
        <div className="absolute -top-3 left-0 right-0 h-1.5 rounded-full bg-primary z-50 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
      )}
      {isDragOver && dragPosition === "bottom" && (
        <div className="absolute -bottom-3 left-0 right-0 h-1.5 rounded-full bg-primary z-50 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
      )}
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, banner.id)}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-lg">Banner {String(banner.slot).padStart(2, "0")}</h3>
        </div>
        
        <div className="flex items-center gap-3">
          <Label htmlFor={`active-${banner.id}`} className="font-medium text-sm text-muted-foreground">
            {banner.is_active ? "Active" : "Inactive"}
          </Label>
          <Switch
            id={`active-${banner.id}`}
            checked={banner.is_active}
            onCheckedChange={(val) => onToggleActive(banner.id, val)}
          />
        </div>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_2fr]">
          
          {/* Left: Image Upload */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-dashed bg-muted/50 group">
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Replace Image
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 opacity-50" />
                  <span className="text-sm font-medium">No image configured</span>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                    Upload Image
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground leading-tight">
                Max 1 MB. PNG, JPEG, or WEBP.<br/>
                Automatically converted to WEBP.
              </p>
              {previewUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  Remove
                </Button>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Right: Text Fields */}
          <div className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <Label htmlFor={`eyebrow-${banner.id}`}>Eyebrow</Label>
              <Input
                id={`eyebrow-${banner.id}`}
                placeholder="e.g. DISCOVER BANGLADESH"
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor={`title-${banner.id}`}>Title <span className="text-destructive">*</span></Label>
              <Input
                id={`title-${banner.id}`}
                placeholder="e.g. Find your next unforgettable stay"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor={`description-${banner.id}`}>Description</Label>
              <Textarea
                id={`description-${banner.id}`}
                placeholder="e.g. From city escapes to quiet retreats..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
          
        </div>
      </form>
    </div>
  )
}
