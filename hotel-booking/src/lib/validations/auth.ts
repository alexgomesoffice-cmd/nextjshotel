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