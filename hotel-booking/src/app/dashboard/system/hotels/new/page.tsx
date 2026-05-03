// filepath: src/app/dashboard/system/hotels/new/page.tsx
// Create Hotel + Admin Account
// Features:
//   - Dynamic hotel type creation (dropdown with "Create New" button)
//   - Multi-section form (info, details, admin)
//   - Full validation and error handling

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, X, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-hooks'
import { cn } from '@/lib/utils'

interface City {
  id: number
  name: string
}

interface HotelType {
  id: number
  name: string
}

interface FormState {
  // Hotel info
  name: string
  city_id: string
  hotel_type_id: string
  email: string
  address: string
  zip_code: string
  owner_name: string
  star_rating: string
  emergency_contact1: string
  emergency_contact2: string
  latitude: string
  longitude: string

  // Hotel details
  description: string
  short_description: string
  check_in_time: string
  check_out_time: string
  advance_deposit_percent: string
  cancellation_policy: string
  cancellation_hours: string
  refund_percent: string
  reception_no1: string
  reception_no2: string

  // Admin
  admin_name: string
  admin_email: string
  admin_password: string
}

interface FormErrors {
  [key: string]: string
}

export default function CreateHotelPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Data
  const [cities, setCities] = useState<City[]>([])
  const [hotelTypes, setHotelTypes] = useState<HotelType[]>([])

  // UI State
  const [loading, setLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [typesLoading, setTypesLoading] = useState(true)
  const [errors, setErrors] = useState<FormErrors>({})

  // Hotel type creation
  const [showCreateType, setShowCreateType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [typeLoading, setTypeLoading] = useState(false)
  const typeInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [form, setForm] = useState<FormState>({
    name: '',
    city_id: '',
    hotel_type_id: '',
    email: '',
    address: '',
    zip_code: '',
    owner_name: '',
    star_rating: '',
    emergency_contact1: '',
    emergency_contact2: '',
    latitude: '',
    longitude: '',
    description: '',
    short_description: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    advance_deposit_percent: '0',
    cancellation_policy: 'FLEXIBLE',
    cancellation_hours: '',
    refund_percent: '',
    reception_no1: '',
    reception_no2: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  })

  // Fetch cities and hotel types
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [citiesRes, typesRes] = await Promise.all([
          fetch('/api/public/cities', { credentials: 'include' }),
          fetch('/api/system-admin/hotel-types', { credentials: 'include' }),
        ])

        const citiesData = await citiesRes.json()
        const typesData = await typesRes.json()

        if (citiesData.success) {
          setCities(Array.isArray(citiesData.data) ? citiesData.data : [])
        } else {
          toast({ title: 'Error', description: 'Failed to load cities', variant: 'destructive' })
        }

        if (typesData.success) {
          // hotel-types returns { data: { hotelTypes: [], pagination: {} } }
          const types = typesData.data?.hotelTypes ?? typesData.data
          setHotelTypes(Array.isArray(types) ? types : [])
        } else {
          toast({ title: 'Error', description: 'Failed to load hotel types', variant: 'destructive' })
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast({ title: 'Error', description: 'Failed to load form data', variant: 'destructive' })
      } finally {
        setCitiesLoading(false)
        setTypesLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Focus on type input when showing
  useEffect(() => {
    if (showCreateType && typeInputRef.current) {
      typeInputRef.current.focus()
    }
  }, [showCreateType])

  // Handle form input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Create new hotel type
  const handleCreateHotelType = async () => {
    if (!newTypeName.trim()) {
      toast({ title: 'Error', description: 'Please enter a hotel type name', variant: 'destructive' })
      return
    }

    try {
      setTypeLoading(true)
      const res = await fetch('/api/system-admin/hotel-types', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName.trim() }),
      })

      const data = await res.json()

      if (data.success) {
        // Add new type to list
        setHotelTypes((prev) => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)))
        // Set it as selected
        setForm((prev) => ({ ...prev, hotel_type_id: data.data.id.toString() }))
        // Close input
        setShowCreateType(false)
        setNewTypeName('')
        toast({
          title: 'Success',
          description: 'Hotel type created successfully',
          variant: 'success',
        })
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to create hotel type',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to create hotel type:', error)
      toast({ title: 'Error', description: 'Failed to create hotel type', variant: 'destructive' })
    } finally {
      setTypeLoading(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      setLoading(true)

      // Prepare payload
      const payload = {
        hotel: {
          name: form.name,
          city_id: parseInt(form.city_id),
          hotel_type_id: parseInt(form.hotel_type_id),
          email: form.email || undefined,
          address: form.address || undefined,
          zip_code: form.zip_code || undefined,
          owner_name: form.owner_name || undefined,
          star_rating: form.star_rating ? parseFloat(form.star_rating) : undefined,
          emergency_contact1: form.emergency_contact1 || undefined,
          emergency_contact2: form.emergency_contact2 || undefined,
          latitude: form.latitude ? parseFloat(form.latitude) : undefined,
          longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        },
        details: {
          description: form.description || undefined,
          short_description: form.short_description || undefined,
          check_in_time: form.check_in_time,
          check_out_time: form.check_out_time,
          advance_deposit_percent: parseInt(form.advance_deposit_percent) || 0,
          cancellation_policy: form.cancellation_policy,
          cancellation_hours: form.cancellation_hours ? parseInt(form.cancellation_hours) : undefined,
          refund_percent: form.refund_percent ? parseInt(form.refund_percent) : undefined,
          reception_no1: form.reception_no1 || undefined,
          reception_no2: form.reception_no2 || undefined,
        },
        admin: {
          admin_name: form.admin_name,
          admin_email: form.admin_email,
          admin_password: form.admin_password,
        },
      }

      const res = await fetch('/api/system-admin/hotels', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Hotel and admin account created successfully',
          variant: 'success',
        })
        router.push('/dashboard/system/hotels')
      } else {
        if (data.errors) {
          // Handle validation errors
          const errorMap: FormErrors = {}
          data.errors.forEach((error: any) => {
            if (error.path && error.path.length > 0) {
              errorMap[error.path[error.path.length - 1]] = error.message
            }
          })
          setErrors(errorMap)
        }
        toast({
          title: 'Error',
          description: data.message || 'Failed to create hotel',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to create hotel:', error)
      toast({ title: 'Error', description: 'Failed to create hotel', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const renderErrorMessage = (fieldName: string) => {
    if (errors[fieldName]) {
      return <p className="text-xs text-red-500 mt-1">{errors[fieldName]}</p>
    }
    return null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Create New Hotel
        </h1>
        <p className="text-muted-foreground mt-1">Set up a hotel and its admin account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Hotel Information */}
        <Card className="glass-strong">
          <CardHeader className="bg-linear-to-r from-primary/10 to-accent/10">
            <CardTitle>Hotel Information</CardTitle>
            <CardDescription>Basic details about the hotel</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Hotel Name */}
            <div>
              <label className="text-sm font-medium">Hotel Name *</label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g., Grand Palace Hotel"
                className={cn(errors.name && 'border-red-500')}
              />
              {renderErrorMessage('name')}
            </div>

            {/* City & Hotel Type Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* City */}
              <div>
                <label className="text-sm font-medium">City *</label>
                <Select value={form.city_id} onValueChange={(v) => setForm((prev) => ({ ...prev, city_id: v }))}>
                  <SelectTrigger className={cn(errors.city_id && 'border-red-500')}>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {citiesLoading ? (
                      <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                    ) : (
                      cities.map((city) => (
                        <SelectItem key={city.id} value={city.id.toString()}>
                          {city.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {renderErrorMessage('city_id')}
              </div>

              {/* Hotel Type with Create Option */}
              <div>
                <label className="text-sm font-medium">Hotel Type *</label>

                {/* Show dropdown when not creating, text input when creating */}
                {!showCreateType ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Select
                        value={form.hotel_type_id}
                        onValueChange={(v) => setForm((prev) => ({ ...prev, hotel_type_id: v }))}
                      >
                        <SelectTrigger className={cn(errors.hotel_type_id && 'border-red-500')}>
                          <SelectValue placeholder="Select or create type" />
                        </SelectTrigger>
                        <SelectContent>
                          {typesLoading ? (
                            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                          ) : (
                            hotelTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateType(true)}
                        className="whitespace-nowrap"
                      >
                        + New Type
                      </Button>
                    </div>
                    {renderErrorMessage('hotel_type_id')}
                  </div>
                ) : (
                  /* Create new hotel type input */
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        ref={typeInputRef}
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="e.g., Luxury Villa"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleCreateHotelType()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateHotelType}
                        disabled={typeLoading || !newTypeName.trim()}
                      >
                        {typeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCreateType(false)
                          setNewTypeName('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Star Rating & Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Star Rating (1-5)</label>
                <Input
                  name="star_rating"
                  type="number"
                  min="1"
                  max="5"
                  step="0.5"
                  value={form.star_rating}
                  onChange={handleChange}
                  placeholder="e.g., 4.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="hotel@example.com"
                />
              </div>
            </div>

            {/* Address & Zip Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Zip Code</label>
                <Input
                  name="zip_code"
                  value={form.zip_code}
                  onChange={handleChange}
                  placeholder="Zip/postal code"
                />
              </div>
            </div>

            {/* Owner & Emergency Contacts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Owner Name</label>
                <Input
                  name="owner_name"
                  value={form.owner_name}
                  onChange={handleChange}
                  placeholder="Hotel owner name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Emergency Contact 1</label>
                <Input
                  name="emergency_contact1"
                  value={form.emergency_contact1}
                  onChange={handleChange}
                  placeholder="+88012345678"
                />
              </div>
            </div>

            {/* Emergency Contact 2 & Coordinates Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Emergency Contact 2</label>
                <Input
                  name="emergency_contact2"
                  value={form.emergency_contact2}
                  onChange={handleChange}
                  placeholder="+88012345678"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Coordinates (Lat, Lng)</label>
                <div className="flex gap-2">
                  <Input
                    name="latitude"
                    type="number"
                    step="0.00001"
                    value={form.latitude}
                    onChange={handleChange}
                    placeholder="23.8103"
                  />
                  <Input
                    name="longitude"
                    type="number"
                    step="0.00001"
                    value={form.longitude}
                    onChange={handleChange}
                    placeholder="90.4125"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Hotel Policies & Details */}
        <Card className="glass-strong">
          <CardHeader className="bg-linear-to-r from-blue-500/10 to-cyan-500/10">
            <CardTitle>Policies & Details</CardTitle>
            <CardDescription>Check-in, cancellation, and house policies</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Hotel description for guests..."
                rows={3}
              />
            </div>

            {/* Short Description */}
            <div>
              <label className="text-sm font-medium">Short Description (max 500 chars)</label>
              <Input
                name="short_description"
                value={form.short_description}
                onChange={handleChange}
                placeholder="Brief description..."
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.short_description.length}/500
              </p>
            </div>

            {/* Check-in/out Times Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Check-in Time</label>
                <Input
                  name="check_in_time"
                  type="time"
                  value={form.check_in_time}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Check-out Time</label>
                <Input
                  name="check_out_time"
                  type="time"
                  value={form.check_out_time}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Deposit Percent */}
            <div>
              <label className="text-sm font-medium">Advance Deposit Required (%)</label>
              <Input
                name="advance_deposit_percent"
                type="number"
                min="0"
                max="100"
                value={form.advance_deposit_percent}
                onChange={handleChange}
              />
            </div>

            {/* Cancellation Policy */}
            <div>
              <label className="text-sm font-medium">Cancellation Policy</label>
              <Select
                value={form.cancellation_policy}
                onValueChange={(v) => setForm((prev) => ({ ...prev, cancellation_policy: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLEXIBLE">Flexible - Full refund anytime</SelectItem>
                  <SelectItem value="MODERATE">Moderate - Partial refund</SelectItem>
                  <SelectItem value="STRICT">Strict - No refund</SelectItem>
                  <SelectItem value="CUSTOM">Custom - Specify hours and refund %</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Cancellation Fields */}
            {form.cancellation_policy === 'CUSTOM' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Cancellation Hours Before Check-in</label>
                  <Input
                    name="cancellation_hours"
                    type="number"
                    min="0"
                    value={form.cancellation_hours}
                    onChange={handleChange}
                    placeholder="e.g., 24"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Refund Percentage (%)</label>
                  <Input
                    name="refund_percent"
                    type="number"
                    min="0"
                    max="100"
                    value={form.refund_percent}
                    onChange={handleChange}
                    placeholder="e.g., 50"
                  />
                </div>
              </div>
            )}

            {/* Reception Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Reception Number 1</label>
                <Input
                  name="reception_no1"
                  value={form.reception_no1}
                  onChange={handleChange}
                  placeholder="+88012345678"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reception Number 2</label>
                <Input
                  name="reception_no2"
                  value={form.reception_no2}
                  onChange={handleChange}
                  placeholder="+88012345678"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Admin Account */}
        <Card className="glass-strong">
          <CardHeader className="bg-linear-to-r from-green-500/10 to-emerald-500/10">
            <CardTitle>Hotel Admin Account</CardTitle>
            <CardDescription>Credentials for the hotel administrator</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Admin Name */}
            <div>
              <label className="text-sm font-medium">Admin Name *</label>
              <Input
                name="admin_name"
                value={form.admin_name}
                onChange={handleChange}
                placeholder="Full name of hotel admin"
                className={cn(errors.admin_name && 'border-red-500')}
              />
              {renderErrorMessage('admin_name')}
            </div>

            {/* Admin Email */}
            <div>
              <label className="text-sm font-medium">Admin Email *</label>
              <Input
                name="admin_email"
                type="email"
                value={form.admin_email}
                onChange={handleChange}
                placeholder="admin@hotel.com"
                className={cn(errors.admin_email && 'border-red-500')}
              />
              {renderErrorMessage('admin_email')}
            </div>

            {/* Admin Password */}
            <div>
              <label className="text-sm font-medium">Temporary Password *</label>
              <Input
                name="admin_password"
                type="password"
                value={form.admin_password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                className={cn(errors.admin_password && 'border-red-500')}
              />
              {renderErrorMessage('admin_password')}
              <p className="text-xs text-muted-foreground mt-1">
                Admin can change password after first login
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure to save these credentials securely. Share them with the hotel administrator.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Creating Hotel...' : 'Create Hotel'}
          </Button>
        </div>
      </form>
    </div>
  )
}