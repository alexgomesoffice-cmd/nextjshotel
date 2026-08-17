'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, Plus, XCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react'

const CATEGORY_LABEL: Record<string, string> = { AMENITY: 'Amenity', BED_TYPE: 'Bed Type', ROOM_FACILITY: 'Room Facility' }
const CATEGORY_ROUTE: Record<string, string> = { AMENITY: '/dashboard/system/amenities', BED_TYPE: '/dashboard/system/bed-types', ROOM_FACILITY: '/dashboard/system/room-facilities' }
const CATEGORY_ACTION: Record<string, string> = { AMENITY: 'Create Amenity', BED_TYPE: 'Create Bed Type', ROOM_FACILITY: 'Create Room Facility' }

export default function MasterDataRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const requestId = params.id

  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dismissOpen, setDismissOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [dismissing, setDismissing] = useState(false)

  const fetchRequest = useCallback(async () => {
    const res = await fetch(`/api/system-admin/master-data-requests/${requestId}`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) setRequest(data.data)
    else { toast({ title: 'Request not found', variant: 'destructive' }); router.push('/dashboard/system/master-data-requests') }
    setLoading(false)
  }, [requestId, router, toast])

  useEffect(() => { fetchRequest() }, [fetchRequest])

  const handleCreate = () => {
    if (!request) return
    const params = new URLSearchParams({ fulfills_request_id: String(request.id), prefill_name: request.name })
    if (request.category === 'AMENITY' && request.context) params.set('prefill_context', request.context)
    router.push(`${CATEGORY_ROUTE[request.category]}?${params}`)
  }

  const handleDismiss = async () => {
    if (!reason.trim()) return
    setDismissing(true)
    try {
      const res = await fetch(`/api/system-admin/master-data-requests/${requestId}/dismiss`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Request dismissed' })
        setDismissOpen(false)
        fetchRequest()
      } else {
        toast({ title: 'Could not dismiss', description: data.message, variant: 'destructive' })
      }
    } finally {
      setDismissing(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  if (!request) return null

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <Link href="/dashboard/system/master-data-requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Master Data Requests
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{request.name}</h1>
        <Badge variant="outline" className="mt-1">{CATEGORY_LABEL[request.category]}{request.context ? ` · ${request.context}` : ''}</Badge>
      </div>

      <Card>
        <CardContent className="p-5 flex items-center gap-3">
          {request.status === 'PENDING' && <><Clock className="h-5 w-5 text-amber-500" /><span className="font-semibold text-amber-600">PENDING</span></>}
          {request.status === 'FULFILLED' && <><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="font-semibold text-green-600">FULFILLED</span></>}
          {request.status === 'DISMISSED' && <><XCircle className="h-5 w-5 text-muted-foreground" /><span className="font-semibold text-muted-foreground">DISMISSED</span></>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request Information</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Hotel</p><p className="font-medium">{request.hotel?.name}</p></div>
            <div><p className="text-xs text-muted-foreground">Requested By</p><p className="font-medium">{request.requester?.name}</p></div>
            <div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-medium">{new Date(request.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reason</p>
            <p className="text-sm mt-1">{request.note}</p>
          </div>
        </CardContent>
      </Card>

      {request.status === 'PENDING' && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold">What would you like to do?</p>
            <div className="flex gap-2">
              <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> {CATEGORY_ACTION[request.category]}</Button>
              <Button variant="outline" onClick={() => setDismissOpen(true)}><XCircle className="h-4 w-4 mr-2" /> Dismiss Request</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {request.status === 'FULFILLED' && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Created Entity</p><p className="font-medium">{request.created_entity_name ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Resolved By</p><p className="font-medium">{request.resolver_name}</p></div>
              <div><p className="text-xs text-muted-foreground">Resolved At</p><p className="font-medium">{new Date(request.resolved_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={CATEGORY_ROUTE[request.category]}><ExternalLink className="h-3.5 w-3.5 mr-2" /> View {CATEGORY_LABEL[request.category]} Catalog</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {request.status === 'DISMISSED' && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Reason</p>
              <p className="text-sm mt-1">{request.resolution_note}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Resolved By</p><p className="font-medium">{request.resolver_name}</p></div>
              <div><p className="text-xs text-muted-foreground">Resolved At</p><p className="font-medium">{new Date(request.resolved_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Request</DialogTitle>
            <DialogDescription>Why are you dismissing this request?</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. This is already covered by the existing Extra Bed option." />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDismissOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!reason.trim() || dismissing} onClick={handleDismiss}>Dismiss Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}