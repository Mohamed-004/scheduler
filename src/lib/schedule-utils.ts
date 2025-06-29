import { type WeeklySchedule, type ScheduleException } from '@/lib/validations/worker-schedule'

/**
 * Utility functions for working with worker schedules
 */

// Get day name from date
export function getDayName(date: Date): keyof WeeklySchedule {
  const days: (keyof WeeklySchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

// Check if worker is available on a specific date (ignoring exceptions)
export function isWorkerAvailableOnDay(schedule: WeeklySchedule, date: Date): boolean {
  const dayName = getDayName(date)
  return schedule[dayName].available
}

// Get worker's working hours for a specific day
export function getWorkingHours(schedule: WeeklySchedule, date: Date): { start: string; end: string; break: number } | null {
  const dayName = getDayName(date)
  const daySchedule = schedule[dayName]
  
  if (!daySchedule.available) {
    return null
  }
  
  return {
    start: daySchedule.start,
    end: daySchedule.end,
    break: daySchedule.break || 0
  }
}

// Calculate net working hours for a day
export function calculateDayNetHours(schedule: WeeklySchedule, date: Date): number {
  const workingHours = getWorkingHours(schedule, date)
  if (!workingHours) return 0
  
  const startTime = new Date(`2000-01-01T${workingHours.start}:00`)
  const endTime = new Date(`2000-01-01T${workingHours.end}:00`)
  const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  const breakHours = workingHours.break / 60
  
  return Math.max(0, totalHours - breakHours)
}

// Calculate total weekly hours
export function calculateWeeklyHours(schedule: WeeklySchedule): number {
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

// Get number of working days
export function getWorkingDaysCount(schedule: WeeklySchedule): number {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  return days.filter(day => schedule[day].available).length
}

// Get average daily hours
export function getAverageDailyHours(schedule: WeeklySchedule): number {
  const totalHours = calculateWeeklyHours(schedule)
  const workingDays = getWorkingDaysCount(schedule)
  
  return workingDays > 0 ? totalHours / workingDays : 0
}

// Check if date falls within an exception
export function isDateInException(date: Date, exception: ScheduleException): boolean {
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)
  
  const startDate = new Date(exception.startDate)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(exception.endDate)
  endDate.setHours(0, 0, 0, 0)
  
  return checkDate >= startDate && checkDate <= endDate
}

// Get active exceptions for a date
export function getActiveExceptions(date: Date, exceptions: ScheduleException[]): ScheduleException[] {
  return exceptions.filter(exception => 
    exception.status === 'approved' && isDateInException(date, exception)
  )
}

// Check if worker is available on a specific date (considering exceptions)
export function isWorkerAvailable(
  schedule: WeeklySchedule, 
  exceptions: ScheduleException[], 
  date: Date
): boolean {
  // First check if it's a working day
  if (!isWorkerAvailableOnDay(schedule, date)) {
    return false
  }
  
  // Then check for approved exceptions
  const activeExceptions = getActiveExceptions(date, exceptions)
  
  // If there are full-day exceptions, worker is not available
  const hasFullDayException = activeExceptions.some(ex => ex.isFullDay)
  if (hasFullDayException) {
    return false
  }
  
  // If there are partial exceptions, worker might still be available for some hours
  // This would need more complex logic to determine exact availability windows
  
  return true
}

// Get available time windows for a date (considering exceptions)
export function getAvailableTimeWindows(
  schedule: WeeklySchedule,
  exceptions: ScheduleException[],
  date: Date
): Array<{ start: string; end: string }> {
  // Check if worker is scheduled to work
  const workingHours = getWorkingHours(schedule, date)
  if (!workingHours) {
    return []
  }
  
  // Get active exceptions
  const activeExceptions = getActiveExceptions(date, exceptions)
  
  // If there's a full-day exception, no availability
  const hasFullDayException = activeExceptions.some(ex => ex.isFullDay)
  if (hasFullDayException) {
    return []
  }
  
  // Start with the full working window
  let availableWindows = [{
    start: workingHours.start,
    end: workingHours.end
  }]
  
  // Remove partial exceptions
  const partialExceptions = activeExceptions.filter(ex => !ex.isFullDay && ex.startTime && ex.endTime)
  
  for (const exception of partialExceptions) {
    // This is a simplified implementation
    // In a real app, you'd need more sophisticated logic to subtract time ranges
    availableWindows = availableWindows.filter(window => {
      // If exception completely overlaps window, remove it
      if (exception.startTime! <= window.start && exception.endTime! >= window.end) {
        return false
      }
      return true
    })
  }
  
  return availableWindows
}

// Format time for display
export function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const min = minutes.padStart(2, '0')
    
    if (hour === 0) return `12:${min} AM`
    if (hour < 12) return `${hour}:${min} AM`
    if (hour === 12) return `12:${min} PM`
    return `${hour - 12}:${min} PM`
  } catch {
    return time
  }
}

// Format duration in hours
export function formatDuration(hours: number): string {
  if (hours === 0) return '0h'
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}m`
  }
  
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  
  if (minutes === 0) return `${wholeHours}h`
  return `${wholeHours}h ${minutes}m`
}

// Get schedule template
export function getScheduleTemplate(templateName: string): WeeklySchedule {
  const templates: Record<string, WeeklySchedule> = {
    fulltime: {
      monday: { available: true, start: '08:00', end: '17:00', break: 60 },
      tuesday: { available: true, start: '08:00', end: '17:00', break: 60 },
      wednesday: { available: true, start: '08:00', end: '17:00', break: 60 },
      thursday: { available: true, start: '08:00', end: '17:00', break: 60 },
      friday: { available: true, start: '08:00', end: '17:00', break: 60 },
      saturday: { available: false, start: '09:00', end: '17:00', break: 0 },
      sunday: { available: false, start: '09:00', end: '17:00', break: 0 }
    },
    parttime: {
      monday: { available: true, start: '09:00', end: '15:00', break: 30 },
      tuesday: { available: false, start: '09:00', end: '15:00', break: 0 },
      wednesday: { available: true, start: '09:00', end: '15:00', break: 30 },
      thursday: { available: false, start: '09:00', end: '15:00', break: 0 },
      friday: { available: true, start: '09:00', end: '15:00', break: 30 },
      saturday: { available: false, start: '09:00', end: '15:00', break: 0 },
      sunday: { available: false, start: '09:00', end: '15:00', break: 0 }
    },
    weekend: {
      monday: { available: false, start: '09:00', end: '17:00', break: 0 },
      tuesday: { available: false, start: '09:00', end: '17:00', break: 0 },
      wednesday: { available: false, start: '09:00', end: '17:00', break: 0 },
      thursday: { available: false, start: '09:00', end: '17:00', break: 0 },
      friday: { available: false, start: '09:00', end: '17:00', break: 0 },
      saturday: { available: true, start: '09:00', end: '17:00', break: 60 },
      sunday: { available: true, start: '09:00', end: '17:00', break: 60 }
    },
    flexible: {
      monday: { available: true, start: '10:00', end: '16:00', break: 45 },
      tuesday: { available: true, start: '10:00', end: '16:00', break: 45 },
      wednesday: { available: true, start: '10:00', end: '16:00', break: 45 },
      thursday: { available: true, start: '10:00', end: '16:00', break: 45 },
      friday: { available: true, start: '10:00', end: '16:00', break: 45 },
      saturday: { available: true, start: '12:00', end: '18:00', break: 30 },
      sunday: { available: false, start: '10:00', end: '16:00', break: 0 }
    }
  }
  
  return templates[templateName] || templates.fulltime
}

// Validate schedule conflicts
export function hasScheduleConflicts(
  schedule: WeeklySchedule,
  exceptions: ScheduleException[]
): { hasConflicts: boolean; conflicts: string[] } {
  const conflicts: string[] = []
  
  // Check for overlapping exceptions
  for (let i = 0; i < exceptions.length; i++) {
    for (let j = i + 1; j < exceptions.length; j++) {
      const exc1 = exceptions[i]
      const exc2 = exceptions[j]
      
      // Check date overlap
      const start1 = new Date(exc1.startDate)
      const end1 = new Date(exc1.endDate)
      const start2 = new Date(exc2.startDate)
      const end2 = new Date(exc2.endDate)
      
      if (start1 <= end2 && start2 <= end1) {
        conflicts.push(`Overlapping exceptions: "${exc1.title}" and "${exc2.title}"`)
      }
    }
  }
  
  // Check for excessive hours
  const totalHours = calculateWeeklyHours(schedule)
  if (totalHours > 60) {
    conflicts.push(`Weekly hours (${totalHours.toFixed(1)}h) exceed maximum of 60 hours`)
  }
  
  // Check for daily limits
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  for (const day of days) {
    const daySchedule = schedule[day]
    if (daySchedule.available && daySchedule.start && daySchedule.end) {
      const startTime = new Date(`2000-01-01T${daySchedule.start}:00`)
      const endTime = new Date(`2000-01-01T${daySchedule.end}:00`)
      const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      const breakHours = (daySchedule.break || 0) / 60
      const netHours = workHours - breakHours
      
      if (netHours > 12) {
        conflicts.push(`${day.charAt(0).toUpperCase() + day.slice(1)} hours (${netHours.toFixed(1)}h) exceed daily maximum of 12 hours`)
      }
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  }
}