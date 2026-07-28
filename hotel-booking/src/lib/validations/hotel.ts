// src/lib/validations/hotel.ts
import { z } from 'zod'

// Documents accept PDF and JPG only — not JPEG as a separate extension,
// even though .jpg/.jpeg share the same MIME type. Enforced by filename
// extension at the API layer (see hotels/route.ts), not just here.
const documentUrl = z.string().optional()

// Hotel creation schema (system admin) — one big transaction:
// hotels + hotel_details + hotel_owner_details(+images) + hotel_admins(+details+images) + hotel_documents
export const createHotelSchema = z.object({
  hotel: z.object({
    name: z.string().min(1, 'Hotel name is required'),
    email: z.string().email('Valid official email required'),
    address: z.string().min(1, 'Full address is required'),
    city_id: z.number().int().positive('City is required'),
    hotel_type_id: z.number().int().positive('Hotel type is required'),
    zip_code: z.string().min(1, 'Zip code is required'),
    map_location: z.string().optional(),
  }),
  details: z.object({
    star_rating: z.number().min(1).max(5, 'Star rating is required'),
    website: z.string().optional(),
    reception_no1: z.string().min(1, 'Reception No. 1 is required'),
    reception_no2: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_designation: z.string().optional(),
    emergency_contact_phone1: z.string().optional(),
    emergency_contact_phone2: z.string().optional(),
    emergency_contact_email: z.string().optional(),
  }),
  owner: z.object({
    full_name: z.string().min(1, "Owner's full name is required"),
    phone: z.string().min(1, "Owner's phone is required"),
    address: z.string().min(1, "Owner's address is required"),
    dob: z.string().optional(),
    nid_no: z.string().optional(),
    passport: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    photo_url: z.string().optional(),
  }),
  admin: z.object({
    admin_name: z.string().min(2, 'Admin name is required'),
    admin_email: z.string().email('Valid admin email required'),
    admin_phone: z.string().min(1, "Admin's phone is required"),
    admin_password: z.string().min(6, 'Password must be at least 6 characters'),
    emergency_phone: z.string().optional(),
    dob: z.string().optional(),
    nid_no: z.string().optional(),
    passport: z.string().optional(),
    address: z.string().optional(),
    photo_url: z.string().optional(),
  }),
  documents: z.object({
    trade_license_url: documentUrl,
    tax_certificate_url: documentUrl,
    tin_certificate_url: documentUrl,
    vat_certificate_url: documentUrl,
    business_document_url: documentUrl,
  }).optional(),
})

export type CreateHotelInput = z.infer<typeof createHotelSchema>

// Update schema — used by system-admin's direct-edit PATCH and hotel-admin's
// own PATCH (which now stages changes via the case engine instead of writing
// directly — see hotel-admin/hotel/route.ts). All optional since it's a PATCH.
export const updateHotelSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city_id: z.number().int().positive().optional(),
  hotel_type_id: z.number().int().positive().optional(),
  zip_code: z.string().optional(),
  map_location: z.string().optional(),
  star_rating: z.number().min(1).max(5).optional(),
  website: z.string().optional(),
  reception_no1: z.string().optional(),
  reception_no2: z.string().optional(),
  description: z.string().optional(),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  advance_deposit_percent: z.number().int().min(0).max(100).optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_designation: z.string().optional(),
  emergency_contact_phone1: z.string().optional(),
  emergency_contact_phone2: z.string().optional(),
  emergency_contact_email: z.string().optional(),
})

export type UpdateHotelInput = z.infer<typeof updateHotelSchema>