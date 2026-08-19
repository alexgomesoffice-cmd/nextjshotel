'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  Globe2,
  Image as ImageIcon,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  ShieldCheck,
  Star,
  UserRound,
  Users,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { EditableSection } from '@/components/admin/hotels/editable-section'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import Image from 'next/image'

interface HotelImage { id: number; image_url: string; is_cover: boolean; sort_order: number }
interface Amenity { id: number; name: string; icon: string | null; context: 'HOTEL' | 'ROOM'; is_active: boolean }
interface HotelAmenity { id: number; amenity: Amenity }
interface Policy { id: number; name: string; description: string; is_active: boolean; updated_at: string }
interface Document { id: number; document_type: string; file_url: string; created_at: string; updated_at: string }
interface RoomSummary {
  id: number; name: string; description: string | null; is_active: boolean
  variant_count: number; room_count: number; min_price: number | null; max_price: number | null; cover_image_url: string | null
}
interface HotelStats {
  room_type_count: number; variant_count: number; room_count: number; amenity_count: number
  gallery_count: number; document_count: number; policy_count: number; booking_count: number; booking_value_total: number
  bookings_by_status: Record<string, number>
}
interface HotelDetail {
  id: number; name: string; slug: string; email: string | null; address: string | null; zip_code: string | null
  map_location: string | null; approval_status: string; created_at: string; updated_at: string; published_at: string | null
  city: { id: number; name: string } | null; hotel_type: { id: number; name: string } | null
  detail: {
    star_rating: string | number | null; guest_rating: string | number | null; website: string | null
    reception_no1: string | null; reception_no2: string | null; description: string | null
    check_in_time: string; check_out_time: string; advance_deposit_percent: number
    emergency_contact_name: string | null; emergency_contact_designation: string | null
    emergency_contact_phone1: string | null; emergency_contact_phone2: string | null; emergency_contact_email: string | null
  } | null
  hotel_admin: { id: number; name: string; email: string; is_active: boolean; is_blocked: boolean; detail: { phone: string | null; address: string | null; manager_name: string | null; manager_phone: string | null; emergency_contact1: string | null; emergency_contact2: string | null } | null } | null
  owner_detail: { id: number; full_name: string; phone: string; address: string; email: string | null; dob: string | null; nid_no: string | null; passport: string | null; images: { id: number; image_url: string; is_active: boolean }[] } | null
  images: HotelImage[]; hotel_amenities: HotelAmenity[]; policies: Policy[]; documents: Document[]
  cases: { id: number; status: string; submitted_at: string; updated_at: string; field_changes: { id: number }[] }[]
  stats: HotelStats
}

interface Booking { id: number; booking_reference: string; check_in: string; check_out: string; total_price: string | number; status: string }
interface Staff { id: number; name: string; email: string; is_active: boolean; is_blocked: boolean; last_login_at: string | null }
interface Activity { id: number; action: string; entity_type: string; entity_id: number | null; created_at: string }

const STATUS_LABEL: Record<string, string> = { UNPUBLISHED: 'Unpublished', PUBLISHED: 'Published', SUSPENDED: 'Suspended' }
const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-600',
  UNPUBLISHED: 'bg-muted-foreground/15 text-muted-foreground',
  SUSPENDED: 'bg-red-500/15 text-red-600',
}
const BOOKING_STATUS_STYLE: Record<string, string> = {
  RESERVED: 'bg-amber-500/15 text-amber-600', BOOKED: 'bg-emerald-500/15 text-emerald-600',
  EXPIRED: 'bg-muted-foreground/15 text-muted-foreground', CANCELLED: 'bg-red-500/15 text-red-600',
  CHECKED_IN: 'bg-blue-500/15 text-blue-600', CHECKED_OUT: 'bg-violet-500/15 text-violet-600', NO_SHOW: 'bg-red-500/15 text-red-600',
}

function date(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}
function dateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  return `৳${Number(value).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function nights(checkIn: string, checkOut: string) {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.round(diff / 86400000))
}

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex gap-3 border-b border-border/40 py-2.5 last:border-0">
      {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 break-words text-sm">{value || '—'}</div>
      </div>
    </div>
  )
}

export default function HotelWorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const hotelId = params.id
  const [hotel, setHotel] = useState<HotelDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set())

  const loadHotel = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/system-admin/hotels/${hotelId}`, { credentials: 'include' })
      const data = await response.json()
      setHotel(data?.data ?? null)
    } finally { setLoading(false) }
  }, [hotelId])

  useEffect(() => { loadHotel() }, [loadHotel])

  const loadTab = useCallback((tab: string) => {
    if (loadedTabs.has(tab)) return
    setLoadedTabs((s) => new Set(s).add(tab))
    if (tab === 'rooms') fetch(`/api/system-admin/hotels/${hotelId}/rooms`, { credentials: 'include' }).then((r) => r.json()).then((d) => setRooms(d?.data ?? []))
    if (tab === 'bookings') fetch(`/api/system-admin/bookings?hotel_id=${hotelId}&limit=50`, { credentials: 'include' }).then((r) => r.json()).then((d) => setBookings(d?.data?.bookings ?? []))
    if (tab === 'staff') fetch(`/api/system-admin/hotels/${hotelId}/staff`, { credentials: 'include' }).then((r) => r.json()).then((d) => setStaff(d?.data ?? []))
    if (tab === 'activity') fetch(`/api/system-admin/hotels/${hotelId}/activity`, { credentials: 'include' }).then((r) => r.json()).then((d) => setActivity(d?.data ?? []))
  }, [hotelId, loadedTabs])

  const patch = async (url: string, body: Record<string, unknown>) => {
    const res = await fetch(url, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.success) await loadHotel()
    return data
  }

  if (loading) return <div className="px-6 py-5 text-sm text-muted-foreground">Loading hotel…</div>
  if (!hotel) return <div className="px-6 py-5 text-sm text-muted-foreground">Hotel not found.</div>

  const bookingValue = hotel.stats?.booking_value_total ?? 0
  const openCase = hotel.cases.find((c) => c.status === 'PENDING')
  const d = hotel.detail
  const cover = hotel.images.find((image) => image.is_cover) ?? hotel.images[0]
  const rating = d?.guest_rating ? Number(d.guest_rating) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b border-border/60 px-6 py-3">
        <button onClick={() => router.back()} className="rounded-sm p-1.5 hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></button>
<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/60 bg-secondary">

{cover ? (
  <Image
    src={cover.image_url}
    alt={hotel.name}
    fill
    sizes="40px"
    className="object-cover"
  />
) : (
  <div className="grid h-full place-items-center text-xs font-bold">
    {hotel.name.slice(0, 2).toUpperCase()}
  </div>
)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold">{hotel.name}</h1>
            <span className={cn('rounded-sm px-1.5 py-0.5 text-[10px] font-medium', STATUS_STYLE[hotel.approval_status])}>{STATUS_LABEL[hotel.approval_status] ?? hotel.approval_status}</span>
            {openCase && <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">PENDING REVIEW</span>}
          </div>
          <p className="truncate text-xs text-muted-foreground">{hotel.city?.name ?? '—'} · {hotel.hotel_type?.name ?? 'Hotel'} · {d?.star_rating ? `${d.star_rating} star` : 'Rating not set'}</p>
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

          <TabsContent value="overview" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Room Types" value={hotel.stats.room_type_count} icon={Building2} />
              <StatCard label="Variants" value={hotel.stats.variant_count} icon={BedDouble} />
              <StatCard label="Physical Rooms" value={hotel.stats.room_count} icon={BedDouble} />
              <StatCard label="Amenities" value={hotel.stats.amenity_count} icon={Check} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <section className="overflow-hidden rounded-md border border-border/60 bg-card">
                <div className="relative aspect-[16/6] min-h-[190px] bg-secondary">
{cover ? (
  <Image
    src={cover.image_url}
    alt={hotel.name}
    fill
    sizes="(max-width: 1024px) 100vw, 60vw"
    className="object-cover"
  />
) : (
  <div className="grid h-full place-items-center text-muted-foreground">
    <ImageIcon className="h-8 w-8" />
  </div>
)}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-3 pt-12 text-white">
                    <div className="text-[10px] uppercase tracking-wider text-white/70">{hotel.hotel_type?.name ?? 'Hotel'}</div>
                    <div className="text-lg font-semibold">{hotel.name}</div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-white/80"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{hotel.city?.name ?? 'Location not set'}</span><span>{hotel.images.length} gallery {hotel.images.length === 1 ? 'image' : 'images'}</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 px-4 py-2 md:grid-cols-4">
                  <InfoRow label="Guest rating" value={rating > 0 ? `${rating.toFixed(2)} / 5` : 'No guest rating'} icon={Star} />
                  <InfoRow label="Check-in" value={d?.check_in_time ?? '-'} icon={Clock3} />
                  <InfoRow label="Check-out" value={d?.check_out_time ?? '-'} icon={Clock3} />
                  <InfoRow label="Bookings" value={hotel.stats.booking_count} icon={CalendarDays} />
                </div>
              </section>

              <section className="rounded-md border border-border/60 bg-card p-4">
  <div className="mb-3 flex items-center justify-between">
    <div>
      <h3 className="text-sm font-semibold">Gallery</h3>
      <p className="text-xs text-muted-foreground">
        Hotel-level property images.
      </p>
    </div>

    <span className="text-[11px] text-muted-foreground">
      {hotel.images.length} images
    </span>
  </div>

  {hotel.images.length === 0 ? (
    <div className="grid min-h-28 place-items-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
      No hotel images uploaded.
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
  {hotel.images
    .slice()
    .sort((a, b) => {
      if (a.is_cover !== b.is_cover) {
        return a.is_cover ? -1 : 1
      }

      return a.sort_order - b.sort_order
    })
    .map((image) => (
      <a
        key={image.id}
        href={image.image_url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'group relative block h-32 overflow-hidden rounded-lg border border-border/60 bg-secondary md:h-40',
          image.is_cover && 'ring-1 ring-primary/50'
        )}
      >
        <Image
          src={image.image_url}
          alt={`${hotel.name} image ${image.sort_order + 1}`}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 300px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />

        {image.is_cover && (
          <div className="absolute left-2 top-2 rounded-md bg-blue-500 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white shadow">
            Cover
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2.5 py-2 text-[10px] text-white">
          <span>
            {image.is_cover
              ? 'Cover image'
              : `Image ${image.sort_order + 1}`}
          </span>

          <span className="rounded bg-black/30 px-1.5 py-0.5 backdrop-blur-sm">
            Open
          </span>
        </div>
      </a>
    ))}
</div>

  )}
</section>

            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-md border border-border/60 bg-card p-4">
                <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Ownership</h3><UserRound className="h-4 w-4 text-muted-foreground" /></div>
                <InfoRow label="Owner" value={hotel.owner_detail?.full_name} />
                <InfoRow label="Owner phone" value={hotel.owner_detail?.phone} icon={Phone} />
                <InfoRow label="Owner email" value={hotel.owner_detail?.email} icon={Mail} />
              </section>
              <section className="rounded-md border border-border/60 bg-card p-4">
                <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Hotel administration</h3><Users className="h-4 w-4 text-muted-foreground" /></div>
                <InfoRow label="Hotel Admin" value={hotel.hotel_admin?.name} />
                <InfoRow label="Admin email" value={hotel.hotel_admin?.email} icon={Mail} />
                <InfoRow label="Admin phone" value={hotel.hotel_admin?.detail?.phone} icon={Phone} />
              </section>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Bookings" value={hotel.stats.booking_count} icon={CalendarDays} hint={Object.entries(hotel.stats.bookings_by_status).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'No bookings'} />
              <StatCard label="Gallery" value={hotel.stats.gallery_count} icon={ImageIcon} hint="Hotel-level images" />
              <StatCard label="Policies" value={hotel.stats.policy_count} icon={ShieldCheck} hint="Active/inactive records" />
              <StatCard label="Documents" value={hotel.stats.document_count} icon={FileText} hint="Uploaded files" />
            </div>

            {d?.description && <section className="rounded-md border border-border/60 bg-card p-4"><h3 className="mb-2 text-sm font-semibold">Description</h3><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{d.description}</p></section>}
          </TabsContent>

          <TabsContent value="property" className="space-y-4 py-4">
            {openCase && <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold text-amber-600">PENDING DRAFT</p><p className="text-xs text-muted-foreground">CASE-{openCase.id} · {openCase.field_changes.length} field changes · Submitted {dateTime(openCase.submitted_at)}</p></div><button onClick={() => router.push(`/dashboard/system/review-queue/${openCase.id}`)} className="rounded-sm bg-amber-500 px-3 py-1.5 text-xs font-medium text-black">Review Draft</button></div><p className="mt-1 text-[11px] text-muted-foreground">Hotel Admin edits remain under review; System Admin edits here go live immediately.</p></div>}

            <section className="rounded-md border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Property identity</h3><p className="text-xs text-muted-foreground">System-level identifiers and publication information.</p></div><span className="font-mono text-[10px] text-muted-foreground">HOTEL-{hotel.id}</span></div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
                <InfoRow label="Hotel type" value={hotel.hotel_type?.name} icon={Building2} />
                <InfoRow label="City" value={hotel.city?.name} icon={MapPin} />
                <InfoRow label="Slug" value={hotel.slug} />
                <InfoRow label="Status" value={STATUS_LABEL[hotel.approval_status] ?? hotel.approval_status} />
                <InfoRow label="Created" value={dateTime(hotel.created_at)} icon={CalendarDays} />
                <InfoRow label="Updated" value={dateTime(hotel.updated_at)} icon={CalendarDays} />
                <InfoRow label="Published" value={dateTime(hotel.published_at)} icon={CalendarDays} />
                <InfoRow label="Map location" value={hotel.map_location ? <a href={hotel.map_location} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open location</a> : '—'} icon={MapPin} />
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <EditableSection title="General" fields={[{ key: 'name', label: 'Hotel Name', value: hotel.name }, { key: 'star_rating', label: 'Star Rating', value: d?.star_rating ?? null, type: 'number' }]} onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)} />
              <EditableSection title="Location" fields={[{ key: 'address', label: 'Address', value: hotel.address }, { key: 'zip_code', label: 'Zip Code', value: hotel.zip_code }]} onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)} />
              <EditableSection title="Contacts" fields={[{ key: 'email', label: 'Official Email', value: hotel.email, type: 'email' }, { key: 'reception_no1', label: 'Reception No. 1', value: d?.reception_no1 ?? null }, { key: 'reception_no2', label: 'Reception No. 2', value: d?.reception_no2 ?? null }, { key: 'website', label: 'Website', value: d?.website ?? null }]} onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)} />
              <EditableSection title="Stay Rules" fields={[{ key: 'check_in_time', label: 'Check-in', value: d?.check_in_time ?? null }, { key: 'check_out_time', label: 'Check-out', value: d?.check_out_time ?? null }]} onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)} />
              <EditableSection title="Description" fields={[{ key: 'description', label: 'Description', value: d?.description ?? null }]} onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)} />
              <EditableSection title="Emergency Contact" fields={[{ key: 'emergency_contact_name', label: 'Name', value: d?.emergency_contact_name ?? null }, { key: 'emergency_contact_designation', label: 'Designation', value: d?.emergency_contact_designation ?? null }, { key: 'emergency_contact_phone1', label: 'Phone 1', value: d?.emergency_contact_phone1 ?? null }, { key: 'emergency_contact_phone2', label: 'Phone 2', value: d?.emergency_contact_phone2 ?? null }, { key: 'emergency_contact_email', label: 'Email', value: d?.emergency_contact_email ?? null }]} onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}`, c)} />
            </div>

            <section className="rounded-md border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Hotel Amenities</h3><p className="text-xs text-muted-foreground">Global System-Admin master data selected for this hotel.</p></div><span className="rounded-sm bg-secondary px-2 py-1 text-[11px] text-muted-foreground">{hotel.hotel_amenities.length} selected</span></div>
              {hotel.hotel_amenities.length === 0 ? <p className="text-xs text-muted-foreground">No hotel amenities selected.</p> : <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">{hotel.hotel_amenities.map(({ amenity }) => <div key={amenity.id} className="flex items-center gap-2 rounded-md border border-border/40 bg-secondary/30 px-3 py-2 text-xs"><Check className="h-3.5 w-3.5 text-emerald-500" /><span>{amenity.name}</span></div>)}</div>}
            </section>

            <section className="rounded-md border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Gallery</h3><p className="text-xs text-muted-foreground">Hotel-level property images.</p></div><span className="text-[11px] text-muted-foreground">{hotel.images.length} images</span></div>
              {hotel.images.length === 0 ? <div className="grid min-h-28 place-items-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">No hotel images uploaded.</div> : <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
  {hotel.images.map((image) => (
    <a
      key={image.id}
      href={image.image_url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'group relative block h-28 overflow-hidden rounded-md border border-border/60 bg-secondary md:h-36',
        image.is_cover && 'ring-1 ring-primary/50'
      )}
    >
      <Image
        src={image.image_url}
        alt={`${hotel.name} image ${image.sort_order + 1}`}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 300px"
        className="object-cover transition-transform duration-200 group-hover:scale-105"
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-gradient-to-t from-black/70 to-black/20 px-2 py-2 text-[10px] text-white">
        <span className="truncate">
          {image.is_cover
            ? 'Cover image'
            : `Image ${image.sort_order + 1}`}
        </span>

        <span className="ml-2 shrink-0 opacity-80">
          Open
        </span>
      </div>

      {image.is_cover && (
        <div className="absolute left-2 top-2 rounded bg-blue-500 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow">
          COVER
        </div>
      )}
    </a>
  ))}
</div>}
            </section>

            <section className="rounded-md border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Policies</h3><p className="text-xs text-muted-foreground">Read-only visibility of hotel policies.</p></div><span className="text-[11px] text-muted-foreground">{hotel.policies.length} records</span></div>
              {hotel.policies.length === 0 ? <p className="text-xs text-muted-foreground">No policies added.</p> : <div className="space-y-2">{hotel.policies.map((policy) => <div key={policy.id} className="rounded-md border border-border/40 bg-secondary/20 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium">{policy.name}</span><span className={cn('rounded-sm px-1.5 py-0.5 text-[10px]', policy.is_active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted-foreground/15 text-muted-foreground')}>{policy.is_active ? 'Active' : 'Inactive'}</span></div><p className="mt-1 whitespace-pre-line text-xs leading-5 text-muted-foreground">{policy.description}</p></div>)}</div>}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <EditableSection
                title="Owner"
                fields={[
                  { key: 'full_name', label: 'Full Name', value: hotel.owner_detail?.full_name ?? null },
                  { key: 'phone', label: 'Phone', value: hotel.owner_detail?.phone ?? null },
                  { key: 'email', label: 'Email', value: hotel.owner_detail?.email ?? null, type: 'email' },
                  { key: 'address', label: 'Address', value: hotel.owner_detail?.address ?? null },
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
                  { key: 'phone', label: 'Phone', value: hotel.hotel_admin?.detail?.phone ?? null },
                  { key: 'address', label: 'Address', value: hotel.hotel_admin?.detail?.address ?? null },
                  { key: 'emergency_phone', label: 'Emergency Phone', value: hotel.hotel_admin?.detail?.emergency_contact1 ?? null },
                ]}
                onSave={(c) => patch(`/api/system-admin/hotels/${hotelId}/admin`, c)}
              />
            </div>

            <section className="rounded-md border border-border/60 bg-card p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Documents</h3><span className="text-[11px] text-muted-foreground">{hotel.documents.length} files</span></div>{hotel.documents.length === 0 ? <p className="text-xs text-muted-foreground">No documents uploaded.</p> : <div className="divide-y divide-border/40">{hotel.documents.map((doc) => <div key={doc.id} className="flex items-center justify-between gap-4 py-2.5"><div><div className="text-xs font-medium">{doc.document_type.replaceAll('_', ' ')}</div><div className="text-[10px] text-muted-foreground">Uploaded {date(doc.created_at)}</div></div><a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View file</a></div>)}</div>}</section>
          </TabsContent>

          <TabsContent value="rooms" className="py-4"><OpsTable><thead><tr><OpsTh>Room Type</OpsTh><OpsTh className="w-24 text-right">Variants</OpsTh><OpsTh className="w-24 text-right">Rooms</OpsTh><OpsTh className="w-40 text-right">Base Price Range</OpsTh><OpsTh className="w-24">Status</OpsTh></tr></thead><tbody>{rooms.length === 0 ? <tr><OpsTd className="text-center text-muted-foreground" colSpan={5}>No room types yet.</OpsTd></tr> : rooms.map((r) => <tr key={r.id} className="hover:bg-secondary/40"><OpsTd><div className="font-medium text-[13px]">{r.name}</div>{r.description && <div className="mt-0.5 max-w-xl truncate text-[11px] text-muted-foreground">{r.description}</div>}</OpsTd><OpsTd className="text-right font-mono text-xs">{r.variant_count}</OpsTd><OpsTd className="text-right font-mono text-xs">{r.room_count}</OpsTd><OpsTd className="text-right font-mono text-xs">{r.min_price != null ? `${money(r.min_price)}–${money(r.max_price)}` : '—'}</OpsTd><OpsTd><span className={cn('rounded-sm px-1.5 py-0.5 text-[11px]', r.is_active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted-foreground/15 text-muted-foreground')}>{r.is_active ? 'Active' : 'Inactive'}</span></OpsTd></tr>)}</tbody></OpsTable></TabsContent>

          <TabsContent value="bookings" className="py-4"><OpsTable><thead><tr><OpsTh>Reference</OpsTh><OpsTh>Check-in</OpsTh><OpsTh>Check-out</OpsTh><OpsTh className="w-24 text-right">Nights</OpsTh><OpsTh className="w-32 text-right">Booking Value</OpsTh><OpsTh>Status</OpsTh></tr></thead><tbody>{bookings.length === 0 ? <tr><OpsTd className="text-center text-muted-foreground" colSpan={6}>No bookings yet.</OpsTd></tr> : bookings.map((b) => <tr key={b.id} className="hover:bg-secondary/40"><OpsTd className="text-xs font-medium">{b.booking_reference}</OpsTd><OpsTd className="text-xs">{date(b.check_in)}</OpsTd><OpsTd className="text-xs">{date(b.check_out)}</OpsTd><OpsTd className="text-right font-mono text-xs">{nights(b.check_in, b.check_out)}</OpsTd><OpsTd className="text-right font-mono text-xs">{money(b.total_price)}</OpsTd><OpsTd><span className={cn('rounded-sm px-1.5 py-0.5 text-[10px] font-medium', BOOKING_STATUS_STYLE[b.status] ?? 'bg-secondary text-muted-foreground')}>{b.status}</span></OpsTd></tr>)}</tbody></OpsTable></TabsContent>

          <TabsContent value="staff" className="py-4"><OpsTable><thead><tr><OpsTh>Name</OpsTh><OpsTh>Role</OpsTh><OpsTh>Email</OpsTh><OpsTh>Last Login</OpsTh><OpsTh className="w-24">Status</OpsTh></tr></thead><tbody>{staff.length === 0 ? <tr><OpsTd className="text-center text-muted-foreground" colSpan={5}>No staff accounts yet.</OpsTd></tr> : staff.map((s) => <tr key={s.id} className="hover:bg-secondary/40"><OpsTd className="text-[13px] font-medium">{s.name}</OpsTd><OpsTd className="text-xs text-muted-foreground">{s.email === hotel.hotel_admin?.email ? 'Hotel Admin' : 'Hotel Sub-Admin'}</OpsTd><OpsTd className="text-xs text-muted-foreground">{s.email}</OpsTd><OpsTd className="text-xs text-muted-foreground">{dateTime(s.last_login_at)}</OpsTd><OpsTd><span className={cn('rounded-sm px-1.5 py-0.5 text-[10px]', s.is_blocked ? 'bg-red-500/15 text-red-600' : s.is_active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted-foreground/15 text-muted-foreground')}>{s.is_blocked ? 'Blocked' : s.is_active ? 'Active' : 'Inactive'}</span></OpsTd></tr>)}</tbody></OpsTable></TabsContent>

          <TabsContent value="commercial" className="space-y-4 py-4"><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="Bookings" value={hotel.stats.booking_count} icon={CalendarDays} /><StatCard label="Booked" value={hotel.stats.bookings_by_status.BOOKED ?? 0} icon={Check} /><StatCard label="Reserved" value={hotel.stats.bookings_by_status.RESERVED ?? 0} icon={Clock3} /><StatCard label="Booking Value" value={money(bookingValue)} icon={Building2} hint="All booking records" /></div><div className="rounded-md border border-border/60 bg-card p-4"><h3 className="text-sm font-semibold">Booking status breakdown</h3><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{Object.entries(hotel.stats.bookings_by_status).map(([status, count]) => <div key={status} className="rounded-md border border-border/40 bg-secondary/20 p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{status.replaceAll('_', ' ')}</div><div className="mt-1 text-lg font-semibold">{count}</div></div>)}</div><p className="mt-3 text-[11px] text-muted-foreground">Booking Value is the reservation total stored in the booking record. This system does not have a payment status or payment transaction model.</p></div></TabsContent>

          <TabsContent value="activity" className="py-4"><div className="rounded-md border border-border/60 bg-card"><div className="border-b border-border/40 px-4 py-3"><h3 className="text-sm font-semibold">Hotel activity</h3><p className="text-xs text-muted-foreground">Recent actions recorded for this property.</p></div><div className="divide-y divide-border/40">{activity.length === 0 ? <p className="px-4 py-6 text-center text-xs text-muted-foreground">No activity recorded yet.</p> : activity.map((a) => <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-3"><div><div className="text-xs font-medium">{a.action}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{a.entity_type}{a.entity_id ? ` · #${a.entity_id}` : ''}</div></div><span className="shrink-0 text-[10px] text-muted-foreground">{dateTime(a.created_at)}</span></div>)}</div></div></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
