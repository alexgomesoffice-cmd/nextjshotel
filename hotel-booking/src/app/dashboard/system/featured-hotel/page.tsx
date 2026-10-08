'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface HotelRow {
  id: number
  name: string
  city: { name: string } | null
  approval_status: 'UNPUBLISHED' | 'PUBLISHED' | 'SUSPENDED'
  is_featured: boolean
  cover_image_url: string | null
}

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-600',
  UNPUBLISHED: 'bg-muted-foreground/15 text-muted-foreground',
  SUSPENDED: 'bg-red-500/15 text-red-600',
}

export default function FeaturedHotelPage() {
  const [rows, setRows] = useState<HotelRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/system-admin/hotels?limit=200&search=${encodeURIComponent(search)}`, { credentials: 'include' })
      const data = await res.json()

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Hotels could not be loaded.')
      }

      setRows(Array.isArray(data?.data?.hotels) ? data.data.hotels : [])
    } catch (loadError) {
      console.error('Failed to load hotel list:', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Hotels could not be loaded.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  const handleToggle = async (hotelId: number, featured: boolean) => {
    try {
      setSavingId(hotelId)
      setError(null)

      const res = await fetch('/api/system-admin/featured-hotel', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, featured }),
      })

      const data = await res.json()

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Featured hotel could not be updated.')
      }

      await load()
    } catch (toggleError) {
      console.error('Failed to update featured hotel:', toggleError)
      setError(toggleError instanceof Error ? toggleError.message : 'Featured hotel could not be updated.')
    } finally {
      setSavingId(null)
    }
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((hotel) => `${hotel.name} ${hotel.city?.name ?? ''}`.toLowerCase().includes(term))
  }, [rows, search])

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="Featured Hotels"
        description="Choose which published hotels should appear in the Featured section across the public website."
      />

      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
        <Sparkles className="h-4 w-4" />
        <span>Multiple published hotels can be featured at the same time.</span>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search hotels…"
          className="h-9 w-full rounded-sm border border-border/60 bg-secondary/40 pl-8 pr-2 text-xs outline-none focus:border-primary/60"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <OpsTable>
        <thead>
          <tr>
            <OpsTh>Hotel</OpsTh>
            <OpsTh className="w-40">Location</OpsTh>
            <OpsTh className="w-32">Status</OpsTh>
            <OpsTh className="w-36 text-right">Featured</OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <OpsTd className="text-center text-muted-foreground" colSpan={4}>Loading hotels…</OpsTd>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <OpsTd className="text-center text-muted-foreground" colSpan={4}>No matching hotels.</OpsTd>
            </tr>
          ) : (
            filteredRows.map((hotel) => {
              const isPublished = hotel.approval_status === 'PUBLISHED'
              const isDisabled = !isPublished || savingId === hotel.id

              return (
                <tr key={hotel.id} className="align-middle">
                  <OpsTd>
                    <div className="flex items-center gap-2.5">
                      {hotel.cover_image_url ? (
                        <Image
                          src={hotel.cover_image_url}
                          alt={hotel.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-sm object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-sm bg-muted" />
                      )}

                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">{hotel.name}</div>
                        <div className="text-[11px] text-muted-foreground">{hotel.city?.name ?? 'Location unavailable'}</div>
                      </div>
                    </div>
                  </OpsTd>

                  <OpsTd className="text-xs text-muted-foreground">{hotel.city?.name ?? '—'}</OpsTd>

                  <OpsTd>
                    <span className={cn('rounded-sm px-1.5 py-0.5 text-[11px] font-medium', STATUS_STYLE[hotel.approval_status])}>
                      {hotel.approval_status}
                    </span>
                  </OpsTd>

                  <OpsTd className="text-right">
                    {!isPublished ? (
                      <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                        <Switch checked={false} disabled aria-label={`${hotel.name} featured toggle unavailable`} />
                        <span>Unavailable</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-[11px] font-medium text-muted-foreground">{hotel.is_featured ? 'ON' : 'OFF'}</span>
                        <Switch
                          checked={hotel.is_featured}
                          disabled={isDisabled}
                          aria-label={`Mark ${hotel.name} as featured`}
                          onCheckedChange={(next) => void handleToggle(hotel.id, next)}
                        />
                      </div>
                    )}
                  </OpsTd>
                </tr>
              )
            })
          )}
        </tbody>
      </OpsTable>
    </div>
  )
}
