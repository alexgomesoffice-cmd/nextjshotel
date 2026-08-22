'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Loader2, Pause, Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

type VariantOption = { id: number; price: number; room_count: number }
type RoomTypeOption = { id: number; name: string; variants: VariantOption[] }
type Rule = {
  id: number
  room_variant_id: number
  name: string
  description: string | null
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discount_value: number | string
  status: 'ACTIVE' | 'PAUSED'
  priority: number
  start_date: string
  end_date: string
  room_variant: { room_type: { id: number; name: string }; price: number | string }
  today_resolved: { effectivePrice: number }
}

type FormState = {
  id?: number
  room_variant_id: string
  name: string
  description: string
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discount_value: string
  priority: string
  start_date: string
  end_date: string
}

const emptyForm: FormState = {
  room_variant_id: '', name: '', description: '', discount_type: 'PERCENTAGE',
  discount_value: '', priority: '0', start_date: new Date().toISOString().slice(0, 10), end_date: '',
}

function money(value: number | string) {
  return `৳${Number(value).toLocaleString()}`
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function ruleState(rule: Rule) {
  if (rule.status === 'PAUSED') return 'PAUSED'
  return rule.end_date.slice(0, 10) < new Date().toISOString().slice(0, 10) ? 'EXPIRED' : 'ACTIVE'
}

export default function HotelPricingPage() {
  const { toast } = useToast()
  const [rules, setRules] = useState<Rule[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [pricingResponse, roomTypeResponse] = await Promise.all([
        fetch('/api/hotel-admin/pricing', { credentials: 'include' }),
        fetch('/api/hotel-admin/room-types', { credentials: 'include' }),
      ])
      const pricingData = await pricingResponse.json()
      const roomTypeData = await roomTypeResponse.json()
      if (!pricingData.success) throw new Error(pricingData.message || 'Could not load pricing rules')
      if (!roomTypeData.success) throw new Error(roomTypeData.message || 'Could not load room variants')
      setRules(pricingData.data)
      setRoomTypes(roomTypeData.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load pricing data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const variants = useMemo(() => roomTypes.flatMap((roomType) => roomType.variants.map((variant) => ({ ...variant, roomTypeName: roomType.name }))), [roomTypes])
  const selectedVariant = variants.find((variant) => String(variant.id) === form.room_variant_id)
  const previewBase = selectedVariant?.price ?? 0
  const previewDiscount = Number(form.discount_value) || 0
  const previewEffective = form.discount_type === 'PERCENTAGE'
    ? previewBase * (1 - previewDiscount / 100)
    : previewBase - previewDiscount

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = `${rule.name} ${rule.room_variant.room_type.name}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (statusFilter === 'ALL' || rule.status === statusFilter)
  })

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true) }
  const openEdit = (rule: Rule) => {
    setForm({
      id: rule.id, room_variant_id: String(rule.room_variant_id), name: rule.name, description: rule.description ?? '',
      discount_type: rule.discount_type, discount_value: String(rule.discount_value), priority: String(rule.priority),
      start_date: rule.start_date.slice(0, 10), end_date: rule.end_date.slice(0, 10),
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.room_variant_id || !form.name.trim() || !form.discount_value || !form.start_date || !form.end_date) {
      toast({ title: 'Complete the required fields', variant: 'destructive' })
      return
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast({ title: 'End date cannot be before start date', variant: 'destructive' })
      return
    }
    if (form.discount_type === 'PERCENTAGE' && previewDiscount > 100) {
      toast({ title: 'Percentage discount cannot exceed 100%', variant: 'destructive' })
      return
    }
    if (previewEffective <= 0) {
      toast({ title: 'Discount must leave a positive nightly price', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        room_variant_id: Number(form.room_variant_id), name: form.name.trim(), description: form.description.trim() || null,
        discount_type: form.discount_type, discount_value: previewDiscount, priority: Number(form.priority) || 0,
        start_date: form.start_date, end_date: form.end_date,
      }
      const response = await fetch(form.id ? `/api/hotel-admin/pricing/${form.id}` : '/api/hotel-admin/pricing', {
        method: form.id ? 'PATCH' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.message || 'Could not save offer')
      toast({ title: form.id ? 'Offer updated' : 'Offer created' })
      setDialogOpen(false)
      await load()
    } catch (saveError) {
      toast({ title: 'Could not save offer', description: saveError instanceof Error ? saveError.message : 'Try again', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (rule: Rule) => {
    const status = rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    const response = await fetch(`/api/hotel-admin/pricing/${rule.id}/status`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    const data = await response.json()
    if (data.success) { toast({ title: status === 'ACTIVE' ? 'Offer activated' : 'Offer paused' }); await load() }
    else toast({ title: 'Could not update offer', description: data.message, variant: 'destructive' })
  }

  const remove = async (rule: Rule) => {
    if (!window.confirm(`Delete “${rule.name}”? Historical bookings keep their price snapshots.`)) return
    const response = await fetch(`/api/hotel-admin/pricing/${rule.id}`, { method: 'DELETE', credentials: 'include' })
    const data = await response.json()
    if (data.success) { toast({ title: 'Offer deleted' }); await load() }
    else toast({ title: 'Could not delete offer', description: data.message, variant: 'destructive' })
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Pricing & Offers</h1><p className="mt-1 text-muted-foreground">Manage variant-level nightly discounts without changing base prices.</p></div>
        <Button onClick={openCreate} disabled={variants.length === 0}><Plus className="mr-2 h-4 w-4" /> Create Offer</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search offers or room types" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <select className="h-8 rounded-lg border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option></select>
      </div>

      {loading ? <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : error ? <Card><CardContent className="flex flex-col items-center gap-3 py-12"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => void load()}>Retry</Button></CardContent></Card> : filteredRules.length === 0 ? <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><Tag className="h-8 w-8 text-muted-foreground/60" /><p className="font-semibold">{rules.length === 0 ? 'No offers yet' : 'No matching offers'}</p><p className="max-w-sm text-sm text-muted-foreground">{rules.length === 0 ? 'Create an offer on a room variant to show a lower effective nightly price.' : 'Try another search or status filter.'}</p>{rules.length === 0 && <Button onClick={openCreate} disabled={variants.length === 0}><Plus className="mr-2 h-4 w-4" /> Create Offer</Button>}</CardContent></Card> : <div className="space-y-3">{filteredRules.map((rule) => { const effective = rule.today_resolved?.effectivePrice ?? Number(rule.room_variant.price); const state = ruleState(rule); return <Card key={rule.id}><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{rule.name}</h2><Badge variant={state === 'ACTIVE' ? 'default' : 'secondary'}>{state === 'EXPIRED' ? 'Expired' : state === 'ACTIVE' ? 'Active' : 'Paused'}</Badge><Badge variant="outline">Priority {rule.priority}</Badge></div><p className="text-sm text-muted-foreground">{rule.room_variant.room_type.name} · Variant #{rule.room_variant_id}</p><p className="text-xs text-muted-foreground">{dateLabel(rule.start_date)} – {dateLabel(rule.end_date)}</p></div><div className="flex flex-wrap items-center gap-5"><div><p className="text-xs text-muted-foreground">Discount</p><p className="font-semibold">{rule.discount_type === 'PERCENTAGE' ? `${Number(rule.discount_value)}% OFF` : `${money(rule.discount_value)} OFF`}</p></div><div><p className="text-xs text-muted-foreground">Today&apos;s effective</p><p className="font-semibold text-primary">{money(effective)} <span className="text-xs font-normal text-muted-foreground">/ night</span></p></div><div className="flex items-center gap-1"><Button variant="outline" size="sm" onClick={() => openEdit(rule)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button><Button variant="ghost" size="sm" onClick={() => void changeStatus(rule)}>{rule.status === 'ACTIVE' ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}{rule.status === 'ACTIVE' ? 'Pause' : 'Activate'}</Button><Button variant="ghost" size="icon" onClick={() => void remove(rule)} aria-label={`Delete ${rule.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div></CardContent></Card> })}</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]"><DialogHeader><DialogTitle>{form.id ? 'Edit Offer' : 'Create Offer'}</DialogTitle><DialogDescription>The offer modifies the selected variant&apos;s base price. It never replaces it.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Room Variant</Label><select className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.room_variant_id} onChange={(event) => setForm((current) => ({ ...current, room_variant_id: event.target.value }))} disabled={Boolean(form.id)}><option value="">Choose a variant</option>{roomTypes.map((roomType) => <optgroup key={roomType.id} label={roomType.name}>{roomType.variants.map((variant) => <option key={variant.id} value={variant.id}>Variant #{variant.id} · {money(variant.price)} · {variant.room_count} rooms</option>)}</optgroup>)}</select></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="offer-name">Name</Label><Input id="offer-name" className="mt-1" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Weekend Special" /></div><div><Label htmlFor="offer-priority">Priority</Label><Input id="offer-priority" className="mt-1" type="number" min="0" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} /></div></div><div><Label htmlFor="offer-description">Description</Label><Input id="offer-description" className="mt-1" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Optional internal note" /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Discount Type</Label><select className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.discount_type} onChange={(event) => setForm((current) => ({ ...current, discount_type: event.target.value as FormState['discount_type'] }))}><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option></select></div><div><Label htmlFor="discount-value">Discount Value</Label><Input id="discount-value" className="mt-1" type="number" min="0.01" step="0.01" value={form.discount_value} onChange={(event) => setForm((current) => ({ ...current, discount_value: event.target.value }))} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="start-date">Start Date</Label><Input id="start-date" className="mt-1" type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} /></div><div><Label htmlFor="end-date">End Date</Label><Input id="end-date" className="mt-1" type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} /></div></div><div className="rounded-lg border border-border bg-muted/40 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ChevronDown className="h-4 w-4 text-primary" /> Pricing Preview</div><div className="flex flex-wrap items-end gap-4 text-sm"><div><p className="text-xs text-muted-foreground">Base</p><p className="font-semibold">{money(previewBase)}</p></div><div><p className="text-xs text-muted-foreground">Discount</p><p className="font-semibold">{form.discount_type === 'PERCENTAGE' ? `${previewDiscount}%` : money(previewDiscount)}</p></div><div><p className="text-xs text-muted-foreground">Effective</p><p className="text-lg font-bold text-primary">{money(Math.max(0, previewEffective))}</p></div></div></div></div><DialogFooter><Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Offer</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
