'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { EditableSection } from '@/components/admin/hotels/editable-section'
import { cn } from '@/lib/utils'

interface HotelDetail {
  id: number
  name: string
  hotel_type_id: number | null
  city_id: number | null
  address: string | null
  email: string | null
  approval_status: string
  city: { name: string } | null
  hotel_type: { name: string } | null
  detail: {
    star_rating: string | null
    website: string | null
    reception_no1: string | null
    reception_no2: string | null
    description: string | null
    emergency_contact_name: string | null
    emergency_contact_designation: string | null
    emergency_contact_phone1: string | null
    emergency_contact_phone2: string | null
    emergency_contact_email: string | null
  } | null
  hotel_admin: { id: number; name: string; email: string; is_active: boolean; is_blocked: boolean } | null
  owner_detail: {
    full_name: string; phone: string; address: string; email: string | null
    dob: string | null; nid_no: string | null; passport: string | null
  } | null
  documents: { document_type: string; file_url: string }[]
  cases: { id: number; status: string; submitted_at: string; updated_at: string; field_changes: { id: string }[] }[]
}

const STATUS_LABEL: Record<string, string> = {
  UNPUBLISHED: 'Unpublished', PUBLISHED: 'Published', SUSPENDED: 'Suspended',
}

export default function HotelWorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const hotelId = params.id

  const [hotel, setHotel] = useState<HotelDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set())

  const loadHotel = useCallback(() => {
    fetch(`/api/system-admin/hotels/${hotelId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setHotel(d?.data ?? null))
      .finally(() => setLoading(false))
  }, [hotelId])

  useEffect(() => { loadHotel() }, [loadHotel])

  const loadTab = (tab: string) => {
    if (loadedTabs.has(tab)) return
    setLoadedTabs((s) => new Set(s).add(tab))
    if (tab === 'rooms') {
      fetch(`/api/system-admin/hotels/${hotelId}/rooms`, { credentials: 'include' })
        .then((r) => r.json()).then((d) => setRooms(d?.data ?? []))
    } else if (tab === 'bookings') {
      fetch(`/api/system-admin/bookings?hotel_id=${hotelId}&limit=50`, { credentials: 'include' })
        .then((r) => r.json()).then((d) => setBookings(d?.data?.bookings ?? d?.data ?? []))
    } else if (tab === 'staff') {
      fetch(`/api/system-admin/hotels/${hotelId}/staff`, { credentials: 'include' })
        .then((r) => r.json()).then((d) => setStaff(d?.data ?? []))
    } else if (tab === 'activity') {
      fetch(`/api/system-admin/hotels/${hotelId}/activity`, { credentials: 'include' })
        .then((r) => r.json()).then((d) => setActivity(d?.data ?? []))
    }
  }

  const patch = async (url: string, body: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) loadHotel()
    return data
  }

  if (loading) return <div className="px-6 py-5 text-sm text-muted-foreground">Loading…</div>
  if (!hotel) return <div className="px-6 py-5 text-sm text-muted-foreground">Hotel not found.</div>

  const openCase = hotel.cases.find((c) => c.status === 'PENDING')
  const d = hotel.detail

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-6 py-3">
        <button onClick={() => router.back()} className="rounded-sm p-1.5 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-xs font-bold">
          {hotel.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">{hotel.name}</h1>
            {openCase && (
              <span className="rounded-sm bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                PENDING REVIEW
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {hotel.city?.name ?? '—'} · Owner {hotel.owner_detail?.full_name ?? '—'}
          </p>
        </div>
        <button className="rounded-sm p-1.5 hover:bg-secondary"><MoreHorizontal className="h-4 w-4" /></button>
      </div>

      <div className="px-16">
        <Tabs defaultValue="overview" onValueChange={loadTab}>
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="commercial">Commercial</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Status', STATUS_LABEL[hotel.approval_status]],
                ['Hotel Type', hotel.hotel_type?.name ?? '-'],
                ['Star Rating', d?.star_rating ?? '-'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                  <div className="text-lg font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Property — goes directly live on save, no case/review involved,
              since System Admin edits are a direct override regardless of
              any pending Hotel Admin case. */}
          <TabsContent value="property" className="space-y-4 py-4">
            {openCase && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-600">PENDING DRAFT</p>
                    <p className="text-xs text-muted-foreground">
                      CASE-{openCase.id} · Modified fields: {openCase.field_changes.length} · Submitted{' '}
                      {new Date(openCase.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/system/review-queue/${openCase.id}`)}
                    className="rounded-sm bg-amber-500 px-3 py-1.5 text-xs font-medium text-black"
                  >
                    Review Draft
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  This only locks Hotel Admin's own editing - your edits below still go live immediately.
                </p>
              </div>
            )}

            <EditableSection
              title="General"
              fields={[
                { key: 'name', label: 'Hotel Name', value: hotel.name },
                { key: 'star_rating', label: 'Star Rating', value: d?.star_rating ?? null, type: 'number' },
              ]}
              onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)}
            />

            <EditableSection
              title="Location"
              fields={[{ key: 'address', label: 'Address', value: hotel.address }]}
              onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)}
            />

            <EditableSection
              title="Contacts"
              fields={[
                { key: 'email', label: 'Official Email', value: hotel.email, type: 'email' },
                { key: 'reception_no1', label: 'Reception No. 1', value: d?.reception_no1 ?? null },
                { key: 'reception_no2', label: 'Reception No. 2', value: d?.reception_no2 ?? null },
                { key: 'website', label: 'Website', value: d?.website ?? null },
              ]}
              onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)}
            />

            <EditableSection
              title="Description"
              fields={[{ key: 'description', label: 'Description', value: d?.description ?? null }]}
              onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)}
            />

            <EditableSection
              title="Emergency Contact"
              fields={[
                { key: 'emergency_contact_name', label: 'Name', value: d?.emergency_contact_name ?? null },
                { key: 'emergency_contact_designation', label: 'Designation', value: d?.emergency_contact_designation ?? null },
                { key: 'emergency_contact_phone1', label: 'Phone 1', value: d?.emergency_contact_phone1 ?? null },
                { key: 'emergency_contact_phone2', label: 'Phone 2', value: d?.emergency_contact_phone2 ?? null },
                { key: 'emergency_contact_email', label: 'Email', value: d?.emergency_contact_email ?? null },
              ]}
              onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)}
            />

            <EditableSection
              title="Owner"
              fields={[
                { key: 'full_name', label: 'Full Name', value: hotel.owner_detail?.full_name ?? null },
                { key: 'phone', label: 'Phone', value: hotel.owner_detail?.phone ?? null },
                { key: 'address', label: 'Address', value: hotel.owner_detail?.address ?? null },
                { key: 'email', label: 'Email', value: hotel.owner_detail?.email ?? null, type: 'email' },
                { key: 'nid_no', label: 'NID', value: hotel.owner_detail?.nid_no ?? null },
                { key: 'passport', label: 'Passport', value: hotel.owner_detail?.passport ?? null },
              ]}
              onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}/owner`, c)}
            />

            <EditableSection
              title="Hotel Admin"
              fields={[
                { key: 'name', label: 'Name', value: hotel.hotel_admin?.name ?? null },
                { key: 'email', label: 'Email (locked)', value: hotel.hotel_admin?.email ?? null, editable: false },
                { key: 'phone', label: 'Phone', value: null },
                { key: 'emergency_phone', label: 'Emergency Phone', value: null },
              ]}
              onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}/admin`, c)}
            />

            <section className="rounded-md border border-border/60 p-4">
              <h3 className="mb-2 text-sm font-semibold">Documents</h3>
              {hotel.documents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No documents uploaded.</p>
              ) : (
                hotel.documents.map((doc, i) => (
                  <div key={i} className="flex justify-between border-b border-border/40 py-2 text-sm">
                    <span className="text-muted-foreground">{doc.document_type}</span>
                    <a href={doc.file_url} target="_blank" className="text-primary hover:underline">View</a>
                  </div>
                ))
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                Replacing a document is deferred to a follow-up pass — view-only for now.
              </p>
            </section>

            <p className="text-[11px] text-muted-foreground">
              Amenities, gallery, and policies management are deferred to a dedicated pass — they need
              checklist/gallery/list-editing UI rather than the simple field editor used above.
            </p>
          </TabsContent>

          {/* Rooms — adapted from the dummy: room types no longer carry a
              single BASE PRICE/BED, since pricing and bed configuration both
              moved to the physical room level. Shows an aggregate instead. */}
          <TabsContent value="rooms" className="py-4">
            <OpsTable>
              <thead>
                <tr>
                  <OpsTh>Room Type</OpsTh>
                  <OpsTh className="w-28 text-right">Rooms</OpsTh>
                  <OpsTh className="w-40 text-right">Price Range</OpsTh>
                  <OpsTh className="w-24">Status</OpsTh>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr><OpsTd className="text-center text-muted-foreground" colSpan={4}>No room types yet.</OpsTd></tr>
                ) : rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/40">
                    <OpsTd className="text-[13px]">{r.name}</OpsTd>
                    <OpsTd className="text-right font-mono text-xs">{r.room_count}</OpsTd>
                    <OpsTd className="text-right font-mono text-xs">
                      {r.min_price != null ? `৳${r.min_price}–${r.max_price}` : '—'}
                    </OpsTd>
                    <OpsTd>
                      <span className={cn('rounded-sm px-1.5 py-0.5 text-[11px]', r.is_active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted-foreground/15 text-muted-foreground')}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </OpsTd>
                  </tr>
                ))}
              </tbody>
            </OpsTable>
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings" className="py-4">
            <OpsTable>
              <thead>
                <tr>
                  <OpsTh>Reference</OpsTh>
                  <OpsTh>Check-in</OpsTh>
                  <OpsTh>Check-out</OpsTh>
                  <OpsTh className="text-right">Total</OpsTh>
                  <OpsTh>Status</OpsTh>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><OpsTd className="text-center text-muted-foreground" colSpan={5}>No bookings yet.</OpsTd></tr>
                ) : bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-secondary/40">
                    <OpsTd className="text-xs">{b.booking_reference}</OpsTd>
                    <OpsTd className="text-xs">{b.check_in?.slice(0, 10)}</OpsTd>
                    <OpsTd className="text-xs">{b.check_out?.slice(0, 10)}</OpsTd>
                    <OpsTd className="text-right font-mono text-xs">৳{b.total_price}</OpsTd>
                    <OpsTd className="text-xs">{b.status}</OpsTd>
                  </tr>
                ))}
              </tbody>
            </OpsTable>
          </TabsContent>

          {/* Staff */}
          <TabsContent value="staff" className="py-4">
            <OpsTable>
              <thead>
                <tr>
                  <OpsTh>Name</OpsTh>
                  <OpsTh>Email</OpsTh>
                  <OpsTh className="w-24">Status</OpsTh>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr><OpsTd className="text-center text-muted-foreground" colSpan={3}>No sub-admins yet.</OpsTd></tr>
                ) : staff.map((s: any) => (
                  <tr key={s.id} className="hover:bg-secondary/40">
                    <OpsTd className="text-[13px]">{s.name}</OpsTd>
                    <OpsTd className="text-xs text-muted-foreground">{s.email}</OpsTd>
                    <OpsTd className="text-xs">{s.is_blocked ? 'Blocked' : s.is_active ? 'Active' : 'Inactive'}</OpsTd>
                  </tr>
                ))}
              </tbody>
            </OpsTable>
          </TabsContent>

          {/* Commercial — no distinct schema concept beyond documents
              (already in Property) and revenue (from bookings), so this
              surfaces the 30-day figures already computed for the Hotels list. */}
          <TabsContent value="commercial" className="py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bookings (30d)</div>
                <div className="text-lg font-semibold">{bookings.length}</div>
              </div>
              <div className="rounded-md border border-border/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue (30d)</div>
                <div className="text-lg font-semibold">
                  ৳{bookings.reduce((sum: number, b: any) => sum + parseFloat(b.total_price || 0), 0).toFixed(2)}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="py-4">
            <div className="space-y-2">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : activity.map((a: any) => (
                <div key={a.id} className="border-b border-border/40 py-2 text-sm">
                  <span className="font-medium">{a.action}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}