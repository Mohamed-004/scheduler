import { z } from 'zod'

// Day schedule validation
export const dayScheduleSchema = z.object({
  available: z.boolean(),
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  break: z.number().min(0).max(480).optional().default(0), // Max 8 hours break
}).refine((data) => {
  if (data.available) {
    // If available, start time must be before end time
    const start = new Date(`2000-01-01T${data.start}:00`)
    const end = new Date(`2000-01-01T${data.end}:00`)
    return start < end
  }
  return true
}, {
  message: 'Start time must be before end time',
  path: ['end']
})

// Weekly schedule validation
export const weeklyScheduleSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
}).refine((data) => {
  // At least one day must be available
  const availableDays = Object.values(data).filter(day => day.available)
  return availableDays.length > 0
}, {
  message: 'At least one day must be available for work',
  path: ['monday'] // Show error on first day
})

// Schedule exception validation
export const scheduleExceptionSchema = z.object({
  type: z.enum(['vacation', 'sick', 'personal', 'holiday', 'emergency'], {
    required_error: 'Exception type is required',
  }),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  isFullDay: z.boolean(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
}).refine((data) => {
  // Start date must be before or equal to end date
  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)
  return startDate <= endDate
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
}).refine((data) => {
  // If not full day, start and end times are required
  if (!data.isFullDay) {
    return data.startTime && data.endTime
  }
  return true
}, {
  message: 'Start and end times are required for partial day exceptions',
  path: ['startTime']
}).refine((data) => {
  // If not full day, start time must be before end time
  if (!data.isFullDay && data.startTime && data.endTime) {
    const start = new Date(`2000-01-01T${data.startTime}:00`)
    const end = new Date(`2000-01-01T${data.endTime}:00`)
    return start < end
  }
  return true
}, {
  message: 'Start time must be before end time',
  path: ['endTime']
}).refine((data) => {
  // Start date should not be in the past (unless it's today)
  const startDate = new Date(data.startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to start of day
  return startDate >= today
}, {
  message: 'Start date cannot be in the past',
  path: ['startDate']
})

// Worker ID validation
export const workerIdSchema = z.string().uuid('Invalid worker ID format')

// Schedule template validation
export const scheduleTemplateSchema = z.enum(['fulltime', 'parttime', 'weekend', 'flexible'], {
  required_error: 'Schedule template is required',
})

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
}).refine((data) => {
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  return start <= end
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate']
}).refine((data) => {
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 365 // Max 1 year range
}, {
  message: 'Date range cannot exceed 365 days',
  path: ['endDate']
})

// Conflict check validation
export const conflictCheckSchema = z.object({
  workerId: workerIdSchema,
  startDateTime: z.string().datetime('Invalid datetime format'),
  endDateTime: z.string().datetime('Invalid datetime format'),
}).refine((data) => {
  const start = new Date(data.startDateTime)
  const end = new Date(data.endDateTime)
  return start < end
}, {
  message: 'Start time must be before end time',
  path: ['endDateTime']
})

// Helper function to calculate total weekly hours
export function calculateWeeklyHours(schedule: z.infer<typeof weeklyScheduleSchema>): number {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  
  return days.reduce((total, day) => {
    const daySchedule = schedule[day]
    if (daySchedule.available && daySchedule.start && daySchedule.end) {
      const startTime = new Date(`2000-01-01T${daySchedule.start}:00`)
      const endTime = new Date(`2000-01-01T${daySchedule.end}:00`)
      const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      const breakHours = (daySchedule.break || 0) / 60
      return total + Math.max(0, workHours - breakHours)
    }
    return total
  }, 0)
}

// Helper function to validate schedule doesn't exceed maximum hours
export const scheduleHoursSchema = weeklyScheduleSchema.refine((data) => {
  const totalHours = calculateWeeklyHours(data)
  return totalHours <= 60 // Maximum 60 hours per week
}, {
  message: 'Total weekly hours cannot exceed 60 hours',
  path: ['monday'] // Show error on first day
}).refine((data) => {
  // Each day should not exceed 12 hours
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  
  for (const day of days) {
    const daySchedule = data[day]
    if (daySchedule.available && daySchedule.start && daySchedule.end) {
      const startTime = new Date(`2000-01-01T${daySchedule.start}:00`)
      const endTime = new Date(`2000-01-01T${daySchedule.end}:00`)
      const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      const breakHours = (daySchedule.break || 0) / 60
      const netHours = workHours - breakHours
      
      if (netHours > 12) {
        return false
      }
    }
  }
  return true
}, {
  message: 'Daily working hours cannot exceed 12 hours',
  path: ['monday'] // Show error on first day
})

// Export types
export type DaySchedule = z.infer<typeof dayScheduleSchema>
export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>
export type ScheduleException = z.infer<typeof scheduleExceptionSchema>
export type ScheduleTemplate = z.infer<typeof scheduleTemplateSchema>
export type DateRange = z.infer<typeof dateRangeSchema>
export type ConflictCheck = z.infer<typeof conflictCheckSchema>