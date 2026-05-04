'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Hotel, MapPin, Building, Star, Clock, Info, Shield, Save, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'

export default function HotelDetailsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    star_rating: '',
    description: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    advance_deposit_percent: '0',
    cancellation_policy: 'FLEXIBLE',
    cancellation_hours: '',
    refund_percent: '',
    contact_email: '',
    contact_phone: '',
    website: '',
  })

  // Read-only fields
  const [readOnly, setReadOnly] = useState({
    slug: '',
    city_name: '',
    hotel_type: '',
    approval_status: '',
  })

  const fetchHotel = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hotel-admin/hotel', { credentials: 'include' })
      const data = await res.json()
      
      if (data.success && data.data) {
        const h = data.data
        const d = h.detail || {}
        
        setForm({
          name: h.name || '',
          address: h.address || '',
          latitude: h.latitude?.toString() || '',
          longitude: h.longitude?.toString() || '',
          star_rating: h.star_rating?.toString() || '',
          description: d.description || '',
          check_in_time: d.check_in_time || '14:00',
          check_out_time: d.check_out_time || '12:00',
          advance_deposit_percent: d.advance_deposit_percent?.toString() || '0',
          cancellation_policy: d.cancellation_policy || 'FLEXIBLE',
          cancellation_hours: d.cancellation_hours?.toString() || '',
          refund_percent: d.refund_percent?.toString() || '',
          contact_email: d.contact_email || h.email || '',
          contact_phone: d.contact_phone || h.emergency_contact1 || '',
          website: d.website || '',
        })
        
        setReadOnly({
          slug: h.slug || '',
          city_name: h.city?.name || 'Unknown',
          hotel_type: h.hotel_type?.name || 'Unknown',
          approval_status: h.approval_status || 'DRAFT',
        })
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to load hotel', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to connect to server', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchHotel()
  }, [fetchHotel])

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const payload = {
        name: form.name,
        address: form.address,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        star_rating: form.star_rating ? parseInt(form.star_rating) : null,
        description: form.description,
        check_in_time: form.check_in_time,
        check_out_time: form.check_out_time,
        advance_deposit_percent: parseInt(form.advance_deposit_percent) || 0,
        cancellation_policy: form.cancellation_policy,
        cancellation_hours: form.cancellation_policy === 'CUSTOM' ? parseInt(form.cancellation_hours) : null,
        refund_percent: form.cancellation_policy === 'CUSTOM' ? parseInt(form.refund_percent) : null,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        website: form.website,
      }

      const res = await fetch('/api/hotel-admin/hotel', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({ title: 'Success', description: 'Hotel details updated successfully', variant: 'success' })
      } else {
        toast({ title: 'Error', description: data.message || 'Validation failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card className="glass-strong">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hotel Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your property's core information and policies</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-1.5 text-sm">
            <div className={`h-2 w-2 rounded-full ${
              readOnly.approval_status === 'PUBLISHED' ? 'bg-green-500' :
              readOnly.approval_status === 'SUSPENDED' ? 'bg-red-500' : 'bg-amber-500'
            }`} />
            <span className="font-medium">{readOnly.approval_status}</span>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">System Admin Managed Fields</p>
          <p className="text-primary/80">City and Hotel Type are restricted. Please contact support to change your City ({readOnly.city_name}) or Hotel Type ({readOnly.hotel_type}).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5 text-primary" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="h-name">Hotel Name</Label>
                <Input 
                  id="h-name" 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="h-desc">Description</Label>
                <Textarea 
                  id="h-desc" 
                  rows={6}
                  placeholder="Describe your property..."
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="h-address" className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> Full Address
                </Label>
                <Input 
                  id="h-address" 
                  value={form.address} 
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="h-lat">Latitude</Label>
                  <Input 
                    id="h-lat" 
                    type="number" step="any"
                    value={form.latitude} 
                    onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="h-lng">Longitude</Label>
                  <Input 
                    id="h-lng" 
                    type="number" step="any"
                    value={form.longitude} 
                    onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" /> Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">Public Email</Label>
                  <Input 
                    id="c-email" 
                    type="email"
                    value={form.contact_email} 
                    onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone">Contact Phone</Label>
                  <Input 
                    id="c-phone" 
                    value={form.contact_phone} 
                    onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} 
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="c-web">Website</Label>
                  <Input 
                    id="c-web" 
                    placeholder="https://"
                    value={form.website} 
                    onChange={e => setForm(f => ({ ...f, website: e.target.value }))} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" /> Ratings & Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Star Rating</Label>
                <Select value={form.star_rating} onValueChange={v => setForm(f => ({ ...f, star_rating: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Star</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Check-in</Label>
                  <Input 
                    type="time" 
                    value={form.check_in_time} 
                    onChange={e => setForm(f => ({ ...f, check_in_time: e.target.value }))} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Check-out</Label>
                  <Input 
                    type="time" 
                    value={form.check_out_time} 
                    onChange={e => setForm(f => ({ ...f, check_out_time: e.target.value }))} 
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  Advance Deposit %
                  <span className="text-xs text-muted-foreground font-normal">Required for booking</span>
                </Label>
                <Input 
                  type="number" min="0" max="100" 
                  value={form.advance_deposit_percent} 
                  onChange={e => setForm(f => ({ ...f, advance_deposit_percent: e.target.value }))} 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Cancellation</Label>
                <Select value={form.cancellation_policy} onValueChange={v => setForm(f => ({ ...f, cancellation_policy: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLEXIBLE">Flexible</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="STRICT">Strict</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground pt-1">
                  {form.cancellation_policy === 'FLEXIBLE' && 'Full refund allowed.'}
                  {form.cancellation_policy === 'STRICT' && 'No refunds allowed.'}
                  {form.cancellation_policy === 'MODERATE' && 'Partial refund allowed.'}
                </p>

                {form.cancellation_policy === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-4 mt-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cancel Before (Hours)</Label>
                      <Input 
                        type="number" min="0" placeholder="e.g. 48"
                        value={form.cancellation_hours}
                        onChange={e => setForm(f => ({ ...f, cancellation_hours: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Refund %</Label>
                      <Input 
                        type="number" min="0" max="100" placeholder="e.g. 50"
                        value={form.refund_percent}
                        onChange={e => setForm(f => ({ ...f, refund_percent: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
