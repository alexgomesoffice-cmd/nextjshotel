'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { OpsSectionHeader } from '@/components/admin/shared/primitives'

interface HotelDetail {
  id: number
  name: string
  email: string | null
  address: string | null
  approval_status: string
  city: { name: string } | null
  hotel_type: { name: string } | null
  detail: { star_rating: string | null; website: string | null } | null
  hotel_admin: { name: string; email: string; is_active: boolean; is_blocked: boolean } | null
  owner_detail: { full_name: string; phone: string; email: string | null } | null
  documents: { document_type: string; file_url: string }[]
}

// Read-only Hotel Workspace. System Admin never edits hotel content
// directly here — only via Review Queue case decisions. Rooms/room types/
// gallery sections will populate once Hotel Admin sets up the property;
// can't be exercised end-to-end yet since no hotel admin work exists.
export default function HotelWorkspacePage() {
  const params = useParams<{ id: string }>()
  const [hotel, setHotel] = useState<HotelDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/system-admin/hotels/${params.id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setHotel(d?.data ?? null))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <div className="px-6 py-5 text-sm text-muted-foreground">Loading…</div>
  if (!hotel) return <div className="px-6 py-5 text-sm text-muted-foreground">Hotel not found.</div>

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between border-b border-border/40 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value ?? '—'}</span>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-5">
      <OpsSectionHeader
        title={hotel.name}
        description={`${hotel.city?.name ?? '—'} · ${hotel.hotel_type?.name ?? '—'} · ${hotel.approval_status}`}
      />

      <section className="rounded-md border border-border/60 p-4">
        <h3 className="mb-2 text-sm font-semibold">Property</h3>
        {row('Official Email', hotel.email)}
        {row('Address', hotel.address)}
        {row('Star Rating', hotel.detail?.star_rating)}
        {row('Website', hotel.detail?.website)}
      </section>

      <section className="rounded-md border border-border/60 p-4">
        <h3 className="mb-2 text-sm font-semibold">Owner</h3>
        {hotel.owner_detail ? (
          <>
            {row('Full Name', hotel.owner_detail.full_name)}
            {row('Phone', hotel.owner_detail.phone)}
            {row('Email', hotel.owner_detail.email)}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No owner information on file.</p>
        )}
      </section>

      <section className="rounded-md border border-border/60 p-4">
        <h3 className="mb-2 text-sm font-semibold">Hotel Admin</h3>
        {hotel.hotel_admin ? (
          <>
            {row('Name', hotel.hotel_admin.name)}
            {row('Email', hotel.hotel_admin.email)}
            {row('Status', hotel.hotel_admin.is_blocked ? 'Blocked' : hotel.hotel_admin.is_active ? 'Active' : 'Inactive')}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No admin assigned.</p>
        )}
      </section>

      <section className="rounded-md border border-border/60 p-4">
        <h3 className="mb-2 text-sm font-semibold">Documents</h3>
        {hotel.documents.length === 0 ? (
          <p className="text-xs text-muted-foreground">No documents uploaded.</p>
        ) : (
          hotel.documents.map((d, i) => (
            <div key={i} className="flex justify-between border-b border-border/40 py-2 text-sm">
              <span className="text-muted-foreground">{d.document_type}</span>
              <a href={d.file_url} target="_blank" className="text-primary hover:underline">View</a>
            </div>
          ))
        )}
      </section>

      <section className="rounded-md border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
        Rooms, room types, and gallery will appear here once Hotel Admin sets up the property —
        nothing exists yet since this is a freshly created, unpublished hotel.
      </section>
    </div>
  )
}