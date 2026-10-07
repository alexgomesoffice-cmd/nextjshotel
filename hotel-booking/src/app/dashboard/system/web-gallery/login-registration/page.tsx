'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ImageIcon, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type BackgroundKind = 'login' | 'registration'

type BackgroundEntry = {
  id: number
  kind: 'LOGIN' | 'REGISTRATION'
  image_url: string | null
  created_at: string
  updated_at: string
}

const cardConfig: Record<BackgroundKind, { label: string; description: string; helper: string; badge: string }> = {
  login: {
    label: 'Login Page Background',
    description: 'Background used on the system login page.',
    helper: 'Upload an image to customize the login page background.',
    badge: 'LOGIN',
  },
  registration: {
    label: 'Registration Page Background',
    description: 'Background used on the registration page.',
    helper: 'Upload an image to customize the registration page background.',
    badge: 'REGISTRATION',
  },
}

export default function AuthBackgroundGalleryPage() {
  const inputRefs = useRef<Record<BackgroundKind, HTMLInputElement | null>>({
    login: null,
    registration: null,
  })

  const [backgrounds, setBackgrounds] = useState<Record<BackgroundKind, BackgroundEntry | null>>({
    login: null,
    registration: null,
  })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<BackgroundKind | null>(null)
  const [deleting, setDeleting] = useState<BackgroundKind | null>(null)

  useEffect(() => {
    const initialiseBackgrounds = async () => {
      try {
        const res = await fetch('/api/system-admin/web-gallery/login-registration', { credentials: 'include' })
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to load gallery settings')
        }

        setBackgrounds({
          login: data.data?.login ?? null,
          registration: data.data?.registration ?? null,
        })
      } catch (error) {
        console.error('Could not load auth backgrounds:', error)
        toast.error('Could not load the background gallery.')
      } finally {
        setLoading(false)
      }
    }

    void initialiseBackgrounds()
  }, [])

  const handleUpload = async (kind: BackgroundKind, file: File | null) => {
    if (!file) return

    setUploading(kind)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch(`/api/system-admin/web-gallery/login-registration/${kind}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Upload failed')
      }

      setBackgrounds((prev) => ({
        ...prev,
        [kind]: data.data,
      }))

      toast.success(`${cardConfig[kind].label} updated successfully.`)
    } catch (error) {
      console.error(`Upload failed for ${kind}:`, error)
      toast.error(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(null)
      if (inputRefs.current[kind]) {
        inputRefs.current[kind]!.value = ''
      }
    }
  }

  const handleDelete = async (kind: BackgroundKind) => {
    const item = backgrounds[kind]
    if (!item || !item.image_url) return

    const confirmed = window.confirm(`Remove the ${cardConfig[kind].label.toLowerCase()} image?`)
    if (!confirmed) return

    setDeleting(kind)

    try {
      const res = await fetch(`/api/system-admin/web-gallery/login-registration/${kind}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Delete failed')
      }

      setBackgrounds((prev) => ({
        ...prev,
        [kind]: data.data,
      }))

      toast.success(`${cardConfig[kind].label} removed.`)
    } catch (error) {
      console.error(`Delete failed for ${kind}:`, error)
      toast.error(error instanceof Error ? error.message : 'Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  const renderCard = (kind: BackgroundKind) => {
    const entry = backgrounds[kind]
    const imageUrl = entry?.image_url ?? null
    const config = cardConfig[kind]

    return (
      <article
        key={kind}
        className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Web Gallery</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{config.label}</h2>
          </div>
          <span className="rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {config.badge}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
          {imageUrl ? (
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src={imageUrl}
                alt={`${config.label} preview`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-slate-950/10 to-slate-900/20" />
              <div className="absolute left-3 top-3 rounded-full border border-white/30 bg-slate-950/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                {config.badge}
              </div>
            </div>
          ) : (
            <div className="flex aspect-[16/9] flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-100 to-slate-200 px-6 text-center text-slate-600 dark:from-slate-900 dark:to-slate-950 dark:text-slate-300">
              <div className="rounded-full border border-dashed border-slate-400/70 bg-white/50 p-3 dark:bg-slate-800/50">
                <ImageIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-semibold">No {kind === 'login' ? 'login' : 'registration'} background configured</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{config.helper}</p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{config.description}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading === kind ? 'Uploading...' : imageUrl ? 'Upload / Replace' : 'Upload Image'}
            <input
              ref={(element) => {
                inputRefs.current[kind] = element
              }}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => handleUpload(kind, event.target.files?.[0] ?? null)}
            />
          </label>

          {imageUrl && (
            <button
              type="button"
              onClick={() => handleDelete(kind)}
              disabled={deleting === kind}
              className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting === kind ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </article>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
          <div className="h-7 w-52 animate-pulse rounded-md bg-muted" />
          <div className="mt-4 h-4 w-96 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
              <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
              <div className="mt-5 aspect-[16/9] animate-pulse rounded-2xl bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Web Gallery</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Login & Registration</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage the background imagery used on the authentication pages.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderCard('login')}
        {renderCard('registration')}
      </div>
    </div>
  )
}
