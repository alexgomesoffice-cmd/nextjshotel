import {
  Hotel, MapPin, Phone, Sparkles, ImageIcon, ClipboardList, Building2,
  UserCircle2, ShieldCheck,
} from 'lucide-react'

export type SectionKey = 'general' | 'location' | 'contacts' | 'amenities' | 'gallery' | 'policies' | 'business' | 'owner' | 'admin'

export const SECTION_META: Record<SectionKey, { title: string; description: string; icon: any; accent: string }> = {
  general:   { title: 'General Information', description: 'Public identity of your hotel', icon: Hotel, accent: 'from-emerald-500 to-green-600' },
  location:  { title: 'Location', description: 'Where guests will find you', icon: MapPin, accent: 'from-sky-500 to-blue-600' },
  contacts:  { title: 'Contact Information', description: 'Phones, email and emergency contact', icon: Phone, accent: 'from-cyan-500 to-teal-600' },
  amenities: { title: 'Amenities', description: 'Everything guests can enjoy', icon: Sparkles, accent: 'from-fuchsia-500 to-pink-600' },
  gallery:   { title: 'Gallery', description: 'Photo library', icon: ImageIcon, accent: 'from-orange-500 to-amber-600' },
  policies:  { title: 'Policies', description: 'Your own house rules and policies', icon: ClipboardList, accent: 'from-lime-500 to-emerald-600' },
  business:  { title: 'Business & Documents', description: 'Legal documents verified by the System Admin', icon: Building2, accent: 'from-slate-500 to-slate-700' },
  owner:     { title: 'Owner Information', description: 'Identity of the property owner', icon: UserCircle2, accent: 'from-purple-500 to-fuchsia-600' },
  admin:     { title: 'Hotel Admin Information', description: 'Your management profile on record', icon: ShieldCheck, accent: 'from-teal-500 to-emerald-600' },
  // roomTypes section removed — Room Type/Variant/Physical Room management
  // is direct Hotel Admin CRUD now, never staged into a case, so nothing
  // will ever appear here for it. See room-variant-matching.ts.
}

const HOTEL_FIELD_GROUPS: Record<string, SectionKey> = {
  name: 'general', star_rating: 'general', description: 'general',
  address: 'location', zip_code: 'location',
  email: 'contacts', reception_no1: 'contacts', reception_no2: 'contacts', website: 'contacts',
  emergency_contact_name: 'contacts', emergency_contact_designation: 'contacts',
  emergency_contact_phone1: 'contacts', emergency_contact_phone2: 'contacts', emergency_contact_email: 'contacts',
}

const ENTITY_TO_SECTION: Record<string, SectionKey> = {
  AMENITY: 'amenities', HOTEL_IMAGE: 'gallery', POLICY: 'policies',
  HOTEL_DOCUMENT: 'business', HOTEL_OWNER: 'owner', HOTEL_ADMIN: 'admin',
}

export function sectionKeyFor(entityType: string, fieldName: string | null): SectionKey {
  if (entityType === 'HOTEL') return HOTEL_FIELD_GROUPS[fieldName ?? ''] ?? 'general'
  return ENTITY_TO_SECTION[entityType] ?? 'general'
}

/** Human label for a field, keyed by entity_type:field_name. */
export const FIELD_LABELS: Record<string, string> = {
  'HOTEL:name': 'Hotel Name', 'HOTEL:star_rating': 'Star Rating', 'HOTEL:description': 'Description',
  'HOTEL:address': 'Full Address', 'HOTEL:zip_code': 'Zip / Postal Code',
  'HOTEL:email': 'Official Email', 'HOTEL:reception_no1': 'Reception Number 1', 'HOTEL:reception_no2': 'Reception Number 2',
  'HOTEL:website': 'Website', 'HOTEL:emergency_contact_name': 'Emergency Contact Name',
  'HOTEL:emergency_contact_designation': 'Emergency Contact Designation', 'HOTEL:emergency_contact_phone1': 'Emergency Phone 1',
  'HOTEL:emergency_contact_phone2': 'Emergency Phone 2', 'HOTEL:emergency_contact_email': 'Emergency Contact Email',
  'HOTEL_OWNER:full_name': 'Full Name', 'HOTEL_OWNER:phone': 'Phone', 'HOTEL_OWNER:email': 'Email',
  'HOTEL_OWNER:dob': 'Date of Birth', 'HOTEL_OWNER:nid_no': 'National ID', 'HOTEL_OWNER:passport': 'Passport', 'HOTEL_OWNER:address': 'Address',
  'HOTEL_ADMIN:name': 'Admin Name', 'HOTEL_ADMIN:phone': 'Phone', 'HOTEL_ADMIN:dob': 'Date of Birth',
  'HOTEL_ADMIN:nid_no': 'National ID', 'HOTEL_ADMIN:passport': 'Passport', 'HOTEL_ADMIN:address': 'Address',
  'HOTEL_ADMIN:emergency_contact1': 'Emergency Phone 1', 'HOTEL_ADMIN:emergency_contact2': 'Emergency Phone 2',
}

export function labelFor(entityType: string, fieldName: string | null): string {
  if (!fieldName) return 'New record'
  return FIELD_LABELS[`${entityType}:${fieldName}`] ?? fieldName
}