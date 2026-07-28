// src/lib/validations/auth.ts
import { z } from 'zod'

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Register schema for end user
export const endUserRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Login response type
export type LoginInput = z.infer<typeof loginSchema>
export type EndUserRegisterInput = z.infer<typeof endUserRegisterSchema>

// System admin creation schema
export const createSystemAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(6, 'Phone number is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(1, 'Address is required'),
  nid_no: z.string().min(1, 'NID number is required'),
  gender: z.string().optional(),
  passport: z.string().optional(),
  image_url: z.string().optional(),
})

export const updateSystemAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  is_active: z.boolean().optional(),
  is_blocked: z.boolean().optional(),
})

// System admin update user schema
export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
})

// System admin block user schema
export const blockUserSchema = z.object({
  is_blocked: z.boolean(),
})