/**
 * Job Validation Schemas
 * Provides type-safe validation for job CRUD operations
 */

import { z } from 'zod'

// Base job schema
export const jobSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  crew_id: z.string().uuid('Invalid crew ID').optional().nullable(),
  job_type: z.string().min(1, 'Job type is required').max(100, 'Job type too long'),
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
  estimated_hours: z.number().min(0.1, 'Must be at least 0.1 hours').max(999.99, 'Too many hours'),
  quote_amount: z.number().min(0, 'Quote amount cannot be negative').max(999999.99, 'Quote amount too large'),
  equipment_required: z.array(z.string()).optional().default([]),
  status: z.enum(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional().default('PENDING'),
  start: z.string().datetime().optional().nullable(),
  finish: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable()
})

// Create job schema (for new jobs)
export const createJobSchema = jobSchema.omit({ status: true })

// Update job schema (allows partial updates)
export const updateJobSchema = jobSchema.partial().extend({
  id: z.string().uuid('Invalid job ID')
})

// Job status update schema
export const updateJobStatusSchema = z.object({
  id: z.string().uuid('Invalid job ID'),
  status: z.enum(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
})

// Job search/filter schema
export const jobFilterSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  client_id: z.string().uuid().optional(),
  crew_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().optional()
})

// Client schema
export const clientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone too long'),
  email: z.string().email('Invalid email').optional().nullable(),
  address: z.string().max(500, 'Address too long').optional().nullable(),
  tz: z.string().optional().default('America/Toronto')
})

export const createClientSchema = clientSchema
export const updateClientSchema = clientSchema.partial().extend({
  id: z.string().uuid('Invalid client ID')
})

// Crew schema
export const crewSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  is_active: z.boolean().optional().default(true)
})

export const createCrewSchema = crewSchema
export const updateCrewSchema = crewSchema.partial().extend({
  id: z.string().uuid('Invalid crew ID')
})

// Worker schema
export const workerSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone too long'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5').optional().default(5.0),
  weekly_hours: z.number().min(0, 'Weekly hours cannot be negative').max(168, 'Cannot exceed 168 hours per week').optional().default(0),
  tz: z.string().optional().default('America/Toronto'),
  is_active: z.boolean().optional().default(true)
})

export const createWorkerSchema = workerSchema
export const updateWorkerSchema = workerSchema.partial().extend({
  id: z.string().uuid('Invalid worker ID')
})

// Timeline item schema
export const timelineItemSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  worker_id: z.string().uuid('Invalid worker ID'),
  start: z.string().datetime('Invalid start time'),
  finish: z.string().datetime('Invalid finish time').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable()
})

export const createTimelineItemSchema = timelineItemSchema
export const updateTimelineItemSchema = timelineItemSchema.partial().extend({
  id: z.string().uuid('Invalid timeline item ID')
})

// Validation helper functions
export const validateJobData = (data: unknown) => {
  return createJobSchema.safeParse(data)
}

export const validateJobUpdate = (data: unknown) => {
  return updateJobSchema.safeParse(data)
}

export const validateClientData = (data: unknown) => {
  return createClientSchema.safeParse(data)
}

export const validateCrewData = (data: unknown) => {
  return createCrewSchema.safeParse(data)
}

// Form data transformers
export const transformJobFormData = (rawData: any) => {
  return {
    client_id: rawData.client_id,
    crew_id: rawData.crew_id || null,
    job_type: rawData.job_type,
    address: rawData.address,
    estimated_hours: rawData.estimated_hours ? parseFloat(rawData.estimated_hours) : undefined,
    quote_amount: rawData.quote_amount ? parseFloat(rawData.quote_amount) : undefined,
    equipment_required: rawData.equipment_required || [],
    start: rawData.start || null,
    finish: rawData.finish || null,
    notes: rawData.notes || null
  }
}

// Type exports
export type JobFormData = z.infer<typeof createJobSchema>
export type JobUpdateData = z.infer<typeof updateJobSchema>
export type ClientFormData = z.infer<typeof createClientSchema>
export type CrewFormData = z.infer<typeof createCrewSchema>
export type WorkerFormData = z.infer<typeof createWorkerSchema>
export type TimelineItemFormData = z.infer<typeof createTimelineItemSchema> 