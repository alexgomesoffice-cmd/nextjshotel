'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Building2, MapPin, Phone, ShieldCheck, Clock, Globe, Info, User, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-hooks'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export default function HotelSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    website: '',
    address: '',
    emergency_contact1: '',
    emergency_contact2: '',
    reception_no1: '',
    reception_no2: '',
    description: '',
    short_description: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    star_rating: '3',
    advance_deposit_percent: 0,
    cancellation_policy: 'FLEXIBLE',
    cancellation_hours: 24,
    refund_percent: 100,
    latitude: '',
    longitude: ''
  })

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    dob: '',
    phone: '',
    nid_no: '',
    passport: '',
    address: '',
    manager_name: '',
    manager_phone: '',
    emergency_contact1: '',
    emergency_contact2: ''
  })

  const [securityForm, setSecurityForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotelRes, profileRes] = await Promise.all([
          fetch('/api/hotel-admin/hotel', { credentials: 'include' }),
          fetch('/api/hotel-admin/profile', { credentials: 'include' })
        ])
        
        const hotelData = await hotelRes.json()
        const profileData = await profileRes.json()

        if (hotelData.success) {
          const hotel = hotelData.data
          setForm({
            name: hotel.name || '',
            email: hotel.email || '',
            website: hotel.detail?.website || '',
            address: hotel.address || '',
            emergency_contact1: hotel.emergency_contact1 || '',
            emergency_contact2: hotel.emergency_contact2 || '',
            reception_no1: hotel.detail?.reception_no1 || '',
            reception_no2: hotel.detail?.reception_no2 || '',
            description: hotel.detail?.description || '',
            short_description: hotel.detail?.short_description || '',
            check_in_time: hotel.detail?.check_in_time || '14:00',
            check_out_time: hotel.detail?.check_out_time || '12:00',
            star_rating: hotel.detail?.star_rating?.toString() || '3',
            advance_deposit_percent: hotel.detail?.advance_deposit_percent || 0,
            cancellation_policy: hotel.detail?.cancellation_policy || 'FLEXIBLE',
            cancellation_hours: hotel.detail?.cancellation_hours || 24,
            refund_percent: hotel.detail?.refund_percent || 100,
            latitude: hotel.latitude?.toString() || '',
            longitude: hotel.longitude?.toString() || ''
          })
        }

        if (profileData.success) {
          const profile = profileData.data
          setProfileForm({
            name: profile.name || '',
            email: profile.email || '',
            dob: profile.detail?.dob ? new Date(profile.detail.dob).toISOString().split('T')[0] : '',
            phone: profile.detail?.phone || '',
            nid_no: profile.detail?.nid_no || '',
            passport: profile.detail?.passport || '',
            address: profile.detail?.address || '',
            manager_name: profile.detail?.manager_name || '',
            manager_phone: profile.detail?.manager_phone || '',
            emergency_contact1: profile.detail?.emergency_contact1 || '',
            emergency_contact2: profile.detail?.emergency_contact2 || ''
          })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to fetch settings', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // 1. Update Hotel Settings
      const hotelPayload = {
        ...form,
        email: form.email && form.email.trim() !== '' ? form.email : null,
        website: form.website && form.website.trim() !== '' ? form.website : null,
        address: form.address && form.address.trim() !== '' ? form.address : null,
        emergency_contact1: form.emergency_contact1 && form.emergency_contact1.trim() !== '' ? form.emergency_contact1 : null,
        emergency_contact2: form.emergency_contact2 && form.emergency_contact2.trim() !== '' ? form.emergency_contact2 : null,
        reception_no1: form.reception_no1 && form.reception_no1.trim() !== '' ? form.reception_no1 : null,
        reception_no2: form.reception_no2 && form.reception_no2.trim() !== '' ? form.reception_no2 : null,
        description: form.description && form.description.trim() !== '' ? form.description : null,
        short_description: form.short_description && form.short_description.trim() !== '' ? form.short_description : null,
        check_in_time: form.check_in_time && form.check_in_time.trim() !== '' ? form.check_in_time : '14:00',
        check_out_time: form.check_out_time && form.check_out_time.trim() !== '' ? form.check_out_time : '12:00',
        star_rating: form.star_rating ? parseFloat(form.star_rating) : 3,
        advance_deposit_percent: isNaN(parseInt(form.advance_deposit_percent as any)) ? 0 : parseInt(form.advance_deposit_percent as any),
        cancellation_policy: form.cancellation_policy || 'FLEXIBLE',
        cancellation_hours: isNaN(parseInt(form.cancellation_hours as any)) ? 24 : parseInt(form.cancellation_hours as any),
        refund_percent: isNaN(parseInt(form.refund_percent as any)) ? 100 : parseInt(form.refund_percent as any),
        latitude: (form.latitude && !isNaN(parseFloat(form.latitude))) ? parseFloat(form.latitude) : null,
        longitude: (form.longitude && !isNaN(parseFloat(form.longitude))) ? parseFloat(form.longitude) : null,
      }

      // 2. Update Profile Settings
      if (securityForm.new_password && securityForm.new_password !== securityForm.confirm_password) {
        toast({ title: 'Validation Error', description: 'Passwords do not match', variant: 'destructive' })
        setSaving(false)
        return
      }

      const profilePayload = { 
        ...profileForm,
        phone: profileForm.phone && profileForm.phone.trim() !== '' ? profileForm.phone : null,
        nid_no: profileForm.nid_no && profileForm.nid_no.trim() !== '' ? profileForm.nid_no : null,
        passport: profileForm.passport && profileForm.passport.trim() !== '' ? profileForm.passport : null,
        address: profileForm.address && profileForm.address.trim() !== '' ? profileForm.address : null,
        manager_name: profileForm.manager_name && profileForm.manager_name.trim() !== '' ? profileForm.manager_name : null,
        manager_phone: profileForm.manager_phone && profileForm.manager_phone.trim() !== '' ? profileForm.manager_phone : null,
        emergency_contact1: profileForm.emergency_contact1 && profileForm.emergency_contact1.trim() !== '' ? profileForm.emergency_contact1 : null,
        emergency_contact2: profileForm.emergency_contact2 && profileForm.emergency_contact2.trim() !== '' ? profileForm.emergency_contact2 : null,
        ...(securityForm.new_password ? { 
          current_password: securityForm.current_password,
          new_password: securityForm.new_password 
        } : {})
      }
      delete (profilePayload as any).email // Email usually readonly for profile

      const [hotelRes, profileRes] = await Promise.all([
        fetch('/api/hotel-admin/hotel', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hotelPayload)
        }),
        fetch('/api/hotel-admin/profile', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload)
        })
      ])

      const hotelData = await hotelRes.json()
      const profileData = await profileRes.json()

      if (hotelData.success && profileData.success) {
        toast({ title: 'Success', description: 'Settings and profile updated successfully', variant: 'success' })
        setSecurityForm({ current_password: '', new_password: '', confirm_password: '' })
      } else {
        toast({ 
          title: 'Partial Success', 
          description: `Hotel: ${hotelData.message || 'OK'}, Profile: ${profileData.message || 'OK'}`, 
          variant: hotelData.success && profileData.success ? 'success' : 'destructive' 
        })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hotel Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your hotel profile, policies, and contact information.</p>
        </div>
        <Button onClick={handleSubmit} disabled={saving} className="gap-2 shadow-lg">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full flex flex-col gap-0">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pb-4 pt-2 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b">
          <TabsList className="flex h-12 items-center justify-start rounded-none bg-transparent p-0 w-full overflow-x-auto no-scrollbar">
            <TabsTrigger 
              value="profile" 
              className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-6 pb-3 pt-2 font-medium text-muted-foreground transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="general" 
              className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-6 pb-3 pt-2 font-medium text-muted-foreground transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Hotel General</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="contact"
              className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-6 pb-3 pt-2 font-medium text-muted-foreground transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>Contact</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="policies"
              className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-6 pb-3 pt-2 font-medium text-muted-foreground transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Policies</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="cancellation"
              className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-6 pb-3 pt-2 font-medium text-muted-foreground transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Cancellation</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="security"
              className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-6 pb-3 pt-2 font-medium text-muted-foreground transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Security</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Your account details and personal profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof_name">Full Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="prof_name" 
                    value={profileForm.name} 
                    onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof_email">Email Address</Label>
                  <Input 
                    id="prof_email" 
                    value={profileForm.email} 
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof_phone">Phone Number</Label>
                  <Input 
                    id="prof_phone" 
                    value={profileForm.phone} 
                    onChange={e => setProfileForm({...profileForm, phone: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof_dob">Date of Birth</Label>
                  <Input 
                    id="prof_dob" 
                    type="date"
                    value={profileForm.dob} 
                    onChange={e => setProfileForm({...profileForm, dob: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof_nid">NID Number</Label>
                  <Input 
                    id="prof_nid" 
                    value={profileForm.nid_no} 
                    onChange={e => setProfileForm({...profileForm, nid_no: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof_passport">Passport Number</Label>
                  <Input 
                    id="prof_passport" 
                    value={profileForm.passport} 
                    onChange={e => setProfileForm({...profileForm, passport: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prof_address">Permanent Address</Label>
                <Textarea 
                  id="prof_address" 
                  value={profileForm.address} 
                  onChange={e => setProfileForm({...profileForm, address: e.target.value})} 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Management Info</CardTitle>
              <CardDescription>Professional contact information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="man_name">Manager Name</Label>
                  <Input 
                    id="man_name" 
                    value={profileForm.manager_name} 
                    onChange={e => setProfileForm({...profileForm, manager_name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="man_phone">Manager Phone</Label>
                  <Input 
                    id="man_phone" 
                    value={profileForm.manager_phone} 
                    onChange={e => setProfileForm({...profileForm, manager_phone: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof_em1">Personal Emergency Contact 1</Label>
                  <Input 
                    id="prof_em1" 
                    value={profileForm.emergency_contact1} 
                    onChange={e => setProfileForm({...profileForm, emergency_contact1: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof_em2">Personal Emergency Contact 2</Label>
                  <Input 
                    id="prof_em2" 
                    value={profileForm.emergency_contact2} 
                    onChange={e => setProfileForm({...profileForm, emergency_contact2: e.target.value})} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Basic Information
              </CardTitle>
              <CardDescription>Primary details about your hotel shown on the listing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Hotel Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    placeholder="Grand Plaza Hotel"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Public Contact Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})} 
                    placeholder="info@hotel.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="website" 
                    className="pl-9"
                    value={form.website} 
                    onChange={e => setForm({...form, website: e.target.value})} 
                    placeholder="https://www.hotel.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description">Short Description (Summary)</Label>
                <Textarea 
                  id="short_description" 
                  value={form.short_description} 
                  onChange={e => setForm({...form, short_description: e.target.value})} 
                  placeholder="A brief summary of your hotel for search results..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Description</Label>
                <Textarea 
                  id="description" 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  placeholder="Detailed description of your hotel, amenities, and surroundings..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Location & Address
              </CardTitle>
              <CardDescription>Where guests can find you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <Textarea 
                  id="address" 
                  value={form.address} 
                  onChange={e => setForm({...form, address: e.target.value})} 
                  placeholder="Road 12, Block C, Banani, Dhaka"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input 
                    id="latitude" 
                    type="number" 
                    step="any"
                    value={form.latitude} 
                    onChange={e => setForm({...form, latitude: e.target.value})} 
                    placeholder="23.7947"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input 
                    id="longitude" 
                    type="number" 
                    step="any"
                    value={form.longitude} 
                    onChange={e => setForm({...form, longitude: e.target.value})} 
                    placeholder="90.4043"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Contact Numbers
              </CardTitle>
              <CardDescription>Reception and emergency contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Reception</h3>
                  <div className="space-y-2">
                    <Label htmlFor="reception_no1">Reception Phone 1</Label>
                    <Input 
                      id="reception_no1" 
                      value={form.reception_no1} 
                      onChange={e => setForm({...form, reception_no1: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reception_no2">Reception Phone 2 (Optional)</Label>
                    <Input 
                      id="reception_no2" 
                      value={form.reception_no2} 
                      onChange={e => setForm({...form, reception_no2: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Emergency</h3>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact1">Emergency Phone 1</Label>
                    <Input 
                      id="emergency_contact1" 
                      value={form.emergency_contact1} 
                      onChange={e => setForm({...form, emergency_contact1: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact2">Emergency Phone 2 (Optional)</Label>
                    <Input 
                      id="emergency_contact2" 
                      value={form.emergency_contact2} 
                      onChange={e => setForm({...form, emergency_contact2: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Standard Times</CardTitle>
              <CardDescription>Default check-in and check-out times for the hotel.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in">Default Check-in Time</Label>
                <Input 
                  id="check_in" 
                  type="time"
                  value={form.check_in_time} 
                  onChange={e => setForm({...form, check_in_time: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out">Default Check-out Time</Label>
                <Input 
                  id="check_out" 
                  type="time"
                  value={form.check_out_time} 
                  onChange={e => setForm({...form, check_out_time: e.target.value})} 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ratings & Bookings</CardTitle>
              <CardDescription>Hotel rating and deposit requirements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Star Rating</Label>
                  <Select value={form.star_rating} onValueChange={v => setForm({...form, star_rating: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Star</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Advance Deposit %</Label>
                  <Input 
                    id="deposit" 
                    type="number"
                    min="0"
                    max="100"
                    value={form.advance_deposit_percent} 
                    onChange={e => setForm({...form, advance_deposit_percent: parseInt(e.target.value) || 0})} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">Percentage of total amount to be paid upfront.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancellation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Cancellation Policy</CardTitle>
              <CardDescription>This policy applies to all room types unless overridden.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Policy Type</Label>
                <Select value={form.cancellation_policy} onValueChange={v => setForm({...form, cancellation_policy: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLEXIBLE">Flexible (Full refund up to 24h)</SelectItem>
                    <SelectItem value="MODERATE">Moderate (Partial refund)</SelectItem>
                    <SelectItem value="STRICT">Strict (No refund)</SelectItem>
                    <SelectItem value="CUSTOM">Custom Policy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(form.cancellation_policy === 'CUSTOM' || form.cancellation_policy === 'MODERATE') && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="can_hours">Cancellation Window (Hours)</Label>
                      <Input 
                        id="can_hours" 
                        type="number"
                        value={form.cancellation_hours} 
                        onChange={e => setForm({...form, cancellation_hours: parseInt(e.target.value) || 0})} 
                      />
                      <p className="text-xs text-muted-foreground">Hours before check-in to qualify for refund.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ref_percent">Refund Percentage</Label>
                      <Input 
                        id="ref_percent" 
                        type="number"
                        min="0"
                        max="100"
                        value={form.refund_percent} 
                        onChange={e => setForm({...form, refund_percent: parseInt(e.target.value) || 0})} 
                      />
                      <p className="text-xs text-muted-foreground">Percentage of amount to be refunded.</p>
                    </div>
                  </div>
                </>
              )}

              <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-sm">
                <p className="font-medium text-foreground mb-1">Policy Overview:</p>
                {form.cancellation_policy === 'FLEXIBLE' && "Guests get a 100% refund if they cancel at least 24 hours before check-in."}
                {form.cancellation_policy === 'MODERATE' && `Guests get a ${form.refund_percent}% refund if they cancel at least ${form.cancellation_hours} hours before check-in.`}
                {form.cancellation_policy === 'STRICT' && "No refunds are provided for cancellations."}
                {form.cancellation_policy === 'CUSTOM' && `Guests get a ${form.refund_percent}% refund if they cancel at least ${form.cancellation_hours} hours before check-in.`}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Security & Password
              </CardTitle>
              <CardDescription>Update your account password and security settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="curr_pass">Current Password</Label>
                  <Input 
                    id="curr_pass" 
                    type="password"
                    placeholder="••••••••"
                    value={securityForm.current_password} 
                    onChange={e => setSecurityForm({...securityForm, current_password: e.target.value})} 
                  />
                  <p className="text-xs text-muted-foreground">Required only if changing password.</p>
                </div>
                <div className="hidden md:block"></div>
                
                <div className="space-y-2">
                  <Label htmlFor="new_pass">New Password</Label>
                  <Input 
                    id="new_pass" 
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={securityForm.new_password} 
                    onChange={e => setSecurityForm({...securityForm, new_password: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conf_pass">Confirm New Password</Label>
                  <Input 
                    id="conf_pass" 
                    type="password"
                    placeholder="••••••••"
                    value={securityForm.confirm_password} 
                    onChange={e => setSecurityForm({...securityForm, confirm_password: e.target.value})} 
                  />
                  {securityForm.new_password && securityForm.confirm_password && securityForm.new_password !== securityForm.confirm_password && (
                    <p className="text-xs text-destructive">Passwords do not match.</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Security Policies</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-dashed">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Passwords must be at least 6 characters long and are encrypted using industry-standard hashing.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
