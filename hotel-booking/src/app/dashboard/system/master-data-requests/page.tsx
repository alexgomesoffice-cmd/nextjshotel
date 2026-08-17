'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { Clock, CheckCircle2, XCircle, ListChecks, Search } from 'lucide-react'

const CATEGORY_LABEL: Record<string, string> = { AMENITY: 'Amenity', BED_TYPE: 'Bed Type', ROOM_FACILITY: 'Room Facility' }
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  FULFILLED: { label: 'Fulfilled', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  DISMISSED: { label: 'Dismissed', className: 'bg-muted text-muted-foreground border-border' },
}

export default function SystemAdminMasterDataRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [summary, setSummary] = useState({ pending: 0, fulfilled: 0, dismissed: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')

  const fetchRequests = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (category) params.set('category', category)
    const res = await fetch(`/api/system-admin/master-data-requests?${params}`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) { setRequests(data.data); setSummary(data.summary) }
    setLoading(false)
  }, [search, status, category])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="Master Data Requests"
        description="Review requests from hotel administrators for new global master data."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Pending" value={summary.pending} icon={Clock} color="from-amber-500 to-orange-500" />
        <SummaryCard title="Fulfilled" value={summary.fulfilled} icon={CheckCircle2} color="from-green-500 to-emerald-500" />
        <SummaryCard title="Dismissed" value={summary.dismissed} icon={XCircle} color="from-slate-500 to-slate-700" />
        <SummaryCard title="Total" value={summary.total} icon={ListChecks} color="from-blue-500 to-indigo-500" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests…" className="pl-9" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm rounded-lg border border-border bg-background px-3 py-2">
          <option value="">All Categories</option>
          <option value="AMENITY">Amenity</option>
          <option value="BED_TYPE">Bed Type</option>
          <option value="ROOM_FACILITY">Room Facility</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm rounded-lg border border-border bg-background px-3 py-2">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh>Hotel</OpsTh>
            <OpsTh>Requested By</OpsTh>
            <OpsTh>Category</OpsTh>
            <OpsTh>Requested Item</OpsTh>
            <OpsTh>Context</OpsTh>
            <OpsTh>Submitted</OpsTh>
            <OpsTh>Status</OpsTh>
            <OpsTh></OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><OpsTd colSpan={8} className="text-center text-muted-foreground py-8">Loading…</OpsTd></tr>
          ) : requests.length === 0 ? (
            <tr><OpsTd colSpan={8} className="text-center text-muted-foreground py-8">No requests found.</OpsTd></tr>
          ) : (
            requests.map((r) => {
              const badge = STATUS_BADGE[r.status]
              return (
                <tr key={r.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => router.push(`/dashboard/system/master-data-requests/${r.id}`)}>
                  <OpsTd>{r.hotel?.name ?? '—'}</OpsTd>
                  <OpsTd>{r.requested_by_name}</OpsTd>
                  <OpsTd><Badge variant="outline">{CATEGORY_LABEL[r.category]}</Badge></OpsTd>
                  <OpsTd className="font-medium">{r.name}</OpsTd>
                  <OpsTd>{r.context ? <Badge variant="outline" className="text-[10px]">{r.context}</Badge> : '—'}</OpsTd>
                  <OpsTd className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</OpsTd>
                  <OpsTd><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.className}`}>{badge.label}</span></OpsTd>
                  <OpsTd className="text-right text-xs text-blue-500">View</OpsTd>
                </tr>
              )
            })
          )}
        </tbody>
      </OpsTable>
    </div>
  )
}

const SummaryCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color}`}>
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
    </CardContent>
  </Card>
)