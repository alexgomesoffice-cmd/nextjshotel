'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, BedDouble, Layers, Plus } from 'lucide-react'
import { RequestDialog } from '@/components/hotel-admin/master-data/request-dialog'
import { RequestHistory } from '@/components/hotel-admin/master-data/request-history'

export default function MasterDataRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogCategory, setDialogCategory] = useState<'AMENITY' | 'BED_TYPE' | 'ROOM_FACILITY' | null>(null)

  const fetchRequests = useCallback(async () => {
    const res = await fetch('/api/hotel-admin/master-data-requests', { credentials: 'include' })
    const data = await res.json()
    if (data.success) setRequests(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Master Data Requests</h1>
        <p className="text-muted-foreground text-sm max-w-2xl mt-1">
          Can&apos;t find something you need while configuring your hotel? Request it here. A System Admin will manually review and create global master data when appropriate.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Request a missing item from the global catalog</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialogCategory('AMENITY')}>
              <Sparkles className="h-4 w-4 mr-2" /> Request Amenity
            </Button>
            <Button variant="outline" onClick={() => setDialogCategory('BED_TYPE')}>
              <BedDouble className="h-4 w-4 mr-2" /> Request Bed Type
            </Button>
            <Button variant="outline" onClick={() => setDialogCategory('ROOM_FACILITY')}>
              <Layers className="h-4 w-4 mr-2" /> Request Room Facility
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-3">My Requests</h2>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : <RequestHistory requests={requests} />}
      </div>

      <RequestDialog open={!!dialogCategory} onOpenChange={(v) => !v && setDialogCategory(null)} category={dialogCategory} onSubmitted={fetchRequests} />
    </div>
  )
}