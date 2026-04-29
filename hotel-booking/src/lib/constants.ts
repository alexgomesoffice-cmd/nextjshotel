// src/lib/constants.ts

// Auth
export const MAX_LOGIN_ATTEMPTS = 5
export const LOCK_DURATION_MINUTES = 15
export const TOKEN_MAX_AGE = 604800 // 7 days in seconds

// Booking
export const RESERVATION_TIMEOUT_MINUTES = 10

// Pagination
export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 10
export const MAX_LIMIT = 100

// File Upload
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const UPLOAD_DIRS = {
  hotels: 'public/uploads/hotels',
  roomTypes: 'public/uploads/rooms/types',
  roomUnits: 'public/uploads/rooms/units',
  staffSysAdmin: 'public/uploads/staff/sys-admin',
  staffHotelAdmin: 'public/uploads/staff/hotel-admin',
  staffSubAdmin: 'public/uploads/staff/sub-admin',
  users: 'public/uploads/users',
  cities: 'public/uploads/cities',
} as const

// API Response
export const API_SUCCESS = { success: true }
export function apiSuccess(data: unknown, message?: string) {
  return { success: true, data, ...(message ? { message } : {}) }
}
export function apiError(message: string, status = 400) {
  return { success: false, message}
}

// Roles
export const ACTOR_TYPES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  HOTEL_ADMIN: 'HOTEL_ADMIN',
  HOTEL_SUB_ADMIN: 'HOTEL_SUB_ADMIN',
  END_USER: 'END_USER',
} as const

export const ROLE_ROUTES: Record<string, string> = {
  SYSTEM_ADMIN: '/dashboard/system',
  HOTEL_ADMIN: '/dashboard/hotel',
  HOTEL_SUB_ADMIN: '/dashboard/sub',
  END_USER: '/',
}

export const LOGIN_ROUTES: Record<string, string> = {
  SYSTEM_ADMIN: '/admin-login',
  HOTEL_ADMIN: '/hotel-login',
  HOTEL_SUB_ADMIN: '/hotel-login',
  END_USER: '/login',
}