'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, ArrowUpRight } from 'lucide-react'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  APPROVED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  REJECTED: 'border-red-500/40 bg-red-500/10 text-red-500',
}

interface CaseRow {
  id: number
  status: string
  hotel: { id: number; name: string; city: string | null }
  submittedBy: string
  submittedByEmail: string
  submittedAt: string
  modifiedFields: number
}

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diffMs / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function ReviewQueuePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('PENDING')
  const [query, setQuery] = useState('')
  const [cityId, setCityId] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [cities, setCities] = useState<{ id: number; name: string }[]>([])
  const [rows, setRows] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/system-admin/cities?limit=200', { credentials: 'include' })
      .then((r) => r.json()).then((d) => setCities(d?.data?.cities ?? []))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ status: tab, search: query })
    if (cityId !== 'all') qs.set('city_id', cityId)
    if (dateRange !== 'all') qs.set('date_range', dateRange)
    fetch(`/api/system-admin/cases?${qs.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setRows(d?.data?.cases ?? []))
      .finally(() => setLoading(false))
  }, [tab, query, cityId, dateRange])

  useEffect(() => { load() }, [load])

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="Review Queue"
        description={`${rows.length} case${rows.length === 1 ? '' : 's'} · processed first-in-first-out · every admin sees the same queue`}
      />

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border/60">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors',
              tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search case #, hotel, submitter…"
            className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/60"
          />
        </div>

        <select value={cityId} onChange={(e) => setCityId(e.target.value)}
          className="h-8 rounded-sm border border-border/60 bg-secondary/40 px-2 text-xs">
          <option value="all">All cities</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
          className="h-8 rounded-sm border border-border/60 bg-secondary/40 px-2 text-xs">
          <option value="all">Any date</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh className="w-24">Case ID</OpsTh>
            <OpsTh>Hotel</OpsTh>
            <OpsTh className="w-44">Submitted By</OpsTh>
            <OpsTh className="w-28">Submitted</OpsTh>
            <OpsTh className="w-28">Status</OpsTh>
            <OpsTh className="w-20 text-right">Actions</OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><OpsTd className="py-12 text-center text-muted-foreground" colSpan={6}>Loading…</OpsTd></tr>
          ) : rows.length === 0 ? (
            <tr><OpsTd className="py-12 text-center text-muted-foreground" colSpan={6}>No cases match the current filters.</OpsTd></tr>
          ) : (
            rows.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-secondary/40">
                <OpsTd>
                  <Link href={`/dashboard/system/review-queue/${c.id}`} className="font-mono text-xs text-foreground hover:underline">
                    CASE-{c.id}
                  </Link>
                </OpsTd>
                <OpsTd>
                  <Link href={`/dashboard/system/review-queue/${c.id}`} className="flex items-center gap-2 hover:underline">
                    <div className="grid h-6 w-6 place-items-center rounded-sm bg-secondary text-[9px] font-semibold">
                      {c.hotel.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13px]">{c.hotel.name}</div>
                      <div className="text-[11px] text-muted-foreground">{c.hotel.city ?? '—'}</div>
                    </div>
                  </Link>
                </OpsTd>
                <OpsTd>
                  <div className="truncate text-[13px]">{c.submittedBy}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{c.submittedByEmail}</div>
                </OpsTd>
                <OpsTd><span className="font-mono text-xs text-muted-foreground">{formatRelative(c.submittedAt)}</span></OpsTd>
                <OpsTd>
                  <span className={cn('inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider', STATUS_STYLE[c.status])}>
                    {c.status}
                  </span>
                </OpsTd>
                <OpsTd className="text-right">
                  <Link href={`/dashboard/system/review-queue/${c.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    Review <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </OpsTd>
              </tr>
            ))
          )}
        </tbody>
      </OpsTable>
    </div>
  )
}