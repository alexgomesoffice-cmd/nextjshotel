'use client'

import { useEffect, useState } from 'react'
import { Clock3, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

type Policy = {
  check_in_time: string
  check_out_time: string
}

export default function HotelPolicyPage() {
  const { toast } = useToast()
  const [policy, setPolicy] = useState<Policy>({ check_in_time: '', check_out_time: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        const response = await fetch('/api/hotel-admin/hotel/policy', { credentials: 'include' })
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load hotel policy')
        }
        setPolicy(data.data)
      } catch (error) {
        toast({
          title: 'Unable to load policy',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadPolicy()
  }, [toast])

  const savePolicy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!TIME_PATTERN.test(policy.check_in_time) || !TIME_PATTERN.test(policy.check_out_time)) {
      toast({ title: 'Invalid time', description: 'Enter both times in HH:mm format.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/hotel-admin/hotel/policy', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save hotel policy')
      }
      setPolicy(data.data)
      toast({ title: 'Policy saved', description: 'Hotel arrival and departure times were updated.', variant: 'success' })
    } catch (error) {
      toast({
        title: 'Unable to save policy',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Hotel Policy</h1>
          <p className="mt-1 text-muted-foreground">Manage the standard arrival and departure times for your hotel.</p>
        </div>
        <Card className="max-w-2xl">
          <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading policy...
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hotel Policy</h1>
        <p className="mt-1 text-muted-foreground">Manage the standard arrival and departure times for your hotel.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" />Stay Policy</CardTitle>
          <CardDescription>These times are the standard arrival and departure times for this hotel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePolicy} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="policy-check-in">Check-in Time</Label>
                <Input id="policy-check-in" type="time" value={policy.check_in_time} onChange={(event) => setPolicy({ ...policy, check_in_time: event.target.value })} required />
                <p className="text-xs text-muted-foreground">The standard time guests can check in at your hotel.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy-check-out">Check-out Time</Label>
                <Input id="policy-check-out" type="time" value={policy.check_out_time} onChange={(event) => setPolicy({ ...policy, check_out_time: event.target.value })} required />
                <p className="text-xs text-muted-foreground">The standard time guests should check out.</p>
              </div>
            </div>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
