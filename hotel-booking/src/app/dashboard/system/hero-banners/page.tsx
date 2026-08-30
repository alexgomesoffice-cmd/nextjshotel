"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { HeroBanner, HeroBannerCard } from "@/components/system-admin/hero-banners/hero-banner-card"

export default function HeroBannersPage() {
  const [banners, setBanners] = useState<HeroBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/system-admin/hero-banners")
      const data = await res.json()
      if (data.success) {
        setBanners(data.data)
      } else {
        toast.error(data.message || "Failed to load banners")
      }
    } catch (error) {
      toast.error("An error occurred while loading banners")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [])

  const handleSave = async (id: number, formData: FormData) => {
    try {
      const res = await fetch(`/api/system-admin/hero-banners/${id}`, {
        method: "PATCH",
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Banner updated successfully")
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? data.data : b))
        )
      } else {
        toast.error(data.message || "Failed to update banner")
      }
    } catch (error) {
      toast.error("An error occurred while updating the banner")
    }
  }

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      // Optimistic update
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: isActive } : b))
      )
      
      const res = await fetch(`/api/system-admin/hero-banners/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Banner ${isActive ? "activated" : "deactivated"}`)
      } else {
        toast.error(data.message || "Failed to update status")
        // Revert on error
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? { ...b, is_active: !isActive } : b))
        )
      }
    } catch (error) {
      toast.error("An error occurred while updating the status")
      // Revert on error
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: !isActive } : b))
      )
    }
  }

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverId !== id) {
      setDragOverId(id)
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    setDragOverId(null)

    if (!draggedId || draggedId === targetId) return

    const draggedIndex = banners.findIndex((b) => b.id === draggedId)
    const targetIndex = banners.findIndex((b) => b.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newBanners = [...banners]
    const [draggedItem] = newBanners.splice(draggedIndex, 1)
    newBanners.splice(targetIndex, 0, draggedItem)

    // Optimistically update UI (but we don't change slot numbers until server confirms)
    // Actually, let's update slot numbers optimistically for a seamless visual transition
    const optimisticallyReordered = newBanners.map((b, idx) => ({
      ...b,
      slot: idx + 1
    }))
    setBanners(optimisticallyReordered)

    try {
      const orderedIds = optimisticallyReordered.map((b) => b.id)
      const res = await fetch("/api/system-admin/hero-banners/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Banners reordered")
      } else {
        toast.error(data.message || "Failed to reorder banners")
        fetchBanners() // revert
      }
    } catch (error) {
      toast.error("An error occurred while reordering")
      fetchBanners() // revert
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading banners...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hero Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage the exactly five banners displayed in the homepage hero carousel. Drag and drop to reorder.
        </p>
      </div>

      <div className="flex flex-col gap-6 pb-10">
        {banners.map((banner) => (
          <HeroBannerCard
            key={banner.id}
            banner={banner}
            onSave={handleSave}
            onToggleActive={handleToggleActive}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isDragging={draggedId === banner.id}
            isDragOver={dragOverId === banner.id}
          />
        ))}
        {banners.length === 0 && (
          <div className="text-center p-8 border rounded-lg bg-muted/20 text-muted-foreground">
            No banners found. Make sure you have run the database seed.
          </div>
        )}
      </div>
    </div>
  )
}
