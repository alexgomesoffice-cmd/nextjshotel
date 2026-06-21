import { z } from 'zod'

export const createCitySchema = z.object({
  name: z.string().min(1, 'City name is required'),
  image_url: z.union([
    z.string().url('Must be a valid URL'),
    z.string().regex(/^\/uploads\//, 'Must be a relative uploads path'),
    z.literal(''),
  ]).optional(),
  is_active: z.boolean().default(true),
})

export const updateCitySchema = createCitySchema.partial()

export const createHotelTypeSchema = z.object({
  name: z.string().min(1, 'Hotel type name is required'),
  is_active: z.boolean().default(true),
})

export const updateHotelTypeSchema = createHotelTypeSchema.partial()

export const createAmenitySchema = z.object({
  name: z.string().min(1, 'Amenity name is required'),
  icon: z.string().optional().or(z.literal('')),
  context: z.enum(['HOTEL', 'ROOM']),
  is_active: z.boolean().default(true),
})

export const updateAmenitySchema = createAmenitySchema.partial()
