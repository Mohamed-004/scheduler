/**
 * Intelligent Scheduling System
 * Provides smart validation and suggestions for job scheduling
 */

import { createClient } from '@/lib/supabase/client'
import type { SchedulingValidation, SchedulingSuggestions } from '@/types/database'

export interface JobSchedulingRequest {
  teamId: string
  scheduledDate: string
  startTime: string
  endTime: string
  requiredWorkers: number
  requiredRoles?: string[]
  excludeJobId?: string // For editing existing jobs
}

export interface SchedulingIssue {
  type: 'error' | 'warning' | 'info'
  code: string
  title: string
  message: string
  suggestions: string[]
  actions?: SchedulingAction[]
}

export interface SchedulingAction {
  label: string
  action: string
  data?: any
}

export interface SchedulingResult {
  valid: boolean
  issues: SchedulingIssue[]
  suggestions: SchedulingSuggestions
  payEstimate?: {
    totalCost: number
    workerCosts: Array<{
      workerId: string
      workerName: string
      hourlyRate: number
      cost: number
    }>
  }
}

export interface RoleValidationResult {
  valid: boolean
  roles: Array<{
    roleId: string
    roleName: string
    status: 'covered' | 'no_workers' | 'insufficient' | 'unavailable'
    requiredWorkers: number
    availableWorkers: Array<{
      workerId: string
      workerName: string
      isAvailable: boolean
      hourlyRate: number
    }>
    issues: SchedulingIssue[]
    suggestions: string[]
  }>
  overallIssues: SchedulingIssue[]
}

export class IntelligentScheduler {
  private supabase = createClient()

  async validateJobScheduling(request: JobSchedulingRequest): Promise<SchedulingResult> {
    const issues: SchedulingIssue[] = []
    let valid = true

    try {
      // 1. Validate basic time constraints
      const timeValidation = this.validateTimeConstraints(request)
      if (!timeValidation.valid) {
        issues.push(...timeValidation.issues)
        valid = false
      }

      // 2. Check worker availability
      const availabilityCheck = await this.checkWorkerAvailability(request)
      if (!availabilityCheck.valid) {
        issues.push(...availabilityCheck.issues)
        if (availabilityCheck.issues.some(i => i.type === 'error')) {
          valid = false
        }
      }

      // 3. Validate worker roles and skills
      const roleValidation = await this.validateWorkerRoles(request)
      if (!roleValidation.valid) {
        issues.push(...roleValidation.issues)
        if (roleValidation.issues.some(i => i.type === 'error')) {
          valid = false
        }
      }

      // 4. Check for scheduling conflicts
      const conflictCheck = await this.checkSchedulingConflicts(request)
      if (!conflictCheck.valid) {
        issues.push(...conflictCheck.issues)
        if (conflictCheck.issues.some(i => i.type === 'error')) {
          valid = false
        }
      }

      // 5. Validate pay rates
      const payValidation = await this.validatePayRates(request)
      if (!payValidation.valid) {
        issues.push(...payValidation.issues)
        // Pay rate issues are warnings, not errors
      }

      // 6. Generate scheduling suggestions
      const suggestions = await this.generateSchedulingSuggestions(request)

      // 7. Calculate pay estimate if valid
      let payEstimate
      if (valid || issues.every(i => i.type !== 'error')) {
        payEstimate = await this.calculatePayEstimate(request)
      }

      return {
        valid,
        issues,
        suggestions,
        payEstimate
      }

    } catch (error) {
      console.error('Error in intelligent scheduling validation:', error)
      return {
        valid: false,
        issues: [{
          type: 'error',
          code: 'VALIDATION_ERROR',
          title: 'Validation Failed',
          message: 'Unable to validate job scheduling. Please try again.',
          suggestions: ['Refresh the page and try again', 'Contact support if the issue persists']
        }],
        suggestions: { available_slots: [], best_times: [] }
      }
    }
  }

  private validateTimeConstraints(request: JobSchedulingRequest): { valid: boolean, issues: SchedulingIssue[] } {
    const issues: SchedulingIssue[] = []

    // Check if date is in the past
    const jobDate = (() => {
      const parts = request.scheduledDate.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1 // Month is 0-indexed
        const day = parseInt(parts[2])
        return new Date(year, month, day)
      }
      return new Date(request.scheduledDate)
    })()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isNaN(jobDate.getTime())) {
      issues.push({
        type: 'error',
        code: 'INVALID_DATE',
        title: 'Invalid Date',
        message: 'Please select a valid date.',
        suggestions: ['Choose a valid date from the calendar']
      })
    } else if (jobDate < today) {
      issues.push({
        type: 'error',
        code: 'PAST_DATE',
        title: 'Invalid Date',
        message: 'Cannot schedule jobs in the past.',
        suggestions: ['Select a future date', 'Choose today or later']
      })
    }

    // Check if time range is valid
    const start = new Date(`2000-01-01T${request.startTime}:00`)
    const end = new Date(`2000-01-01T${request.endTime}:00`)

    if (end <= start) {
      issues.push({
        type: 'error',
        code: 'INVALID_TIME_RANGE',
        title: 'Invalid Time Range',
        message: 'End time must be after start time.',
        suggestions: ['Set an end time that comes after the start time']
      })
    }

    // Check for reasonable business hours
    const startHour = start.getHours()
    const endHour = end.getHours()

    if (startHour < 6 || endHour > 22) {
      issues.push({
        type: 'warning',
        code: 'UNUSUAL_HOURS',
        title: 'Unusual Hours',
        message: 'Job is scheduled outside typical business hours (6 AM - 10 PM).',
        suggestions: ['Consider scheduling during business hours', 'Verify with client if early/late hours are acceptable']
      })
    }

    // Check for very long or very short jobs
    const durationMs = end.getTime() - start.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)

    if (durationHours > 12) {
      issues.push({
        type: 'warning',
        code: 'VERY_LONG_JOB',
        title: 'Very Long Job',
        message: `Job duration is ${durationHours.toFixed(1)} hours. Consider breaking into multiple days.`,
        suggestions: ['Split into multiple shorter jobs', 'Ensure adequate breaks for workers']
      })
    } else if (durationHours < 0.5) {
      issues.push({
        type: 'warning',
        code: 'VERY_SHORT_JOB',
        title: 'Very Short Job',
        message: `Job duration is only ${durationHours.toFixed(1)} hours.`,
        suggestions: ['Consider minimum billing hours', 'Combine with other nearby jobs']
      })
    }

    return { valid: issues.filter(i => i.type === 'error').length === 0, issues }
  }

  private async checkWorkerAvailability(request: JobSchedulingRequest): Promise<{ valid: boolean, issues: SchedulingIssue[] }> {
    const issues: SchedulingIssue[] = []

    try {
      // First, try to get users who are workers
      const { data: allUsers, error: usersError } = await this.supabase
        .from('users')
        .select('id, name, role')
        .eq('team_id', request.teamId)
        .eq('role', 'worker')
        .eq('is_active', true)

      if (usersError) throw usersError

      const userWorkers = allUsers || []

      // Then try to get workers table data
      const { data: workersData, error: workersError } = await this.supabase
        .from('workers')
        .select('id, user_id, name, default_schedule, is_active')
        .eq('is_active', true)

      if (workersError) {
        console.warn('Workers table query failed:', workersError)
      }

      const workers = workersData || []

      // If no workers in either table, provide helpful guidance
      if (userWorkers.length === 0) {
        issues.push({
          type: 'error',
          code: 'NO_WORKERS',
          title: 'No Workers Available',
          message: 'Your team has no active workers.',
          suggestions: [
            'Add workers to your team first',
            'Go to Team Management to invite workers',
            'Activate existing workers'
          ],
          actions: [
            { label: 'Add Workers', action: 'navigate', data: '/dashboard/team' }
          ]
        })
        return { valid: false, issues }
      }

      if (request.requiredWorkers > userWorkers.length) {
        issues.push({
          type: 'error',
          code: 'INSUFFICIENT_WORKERS',
          title: 'Not Enough Workers',
          message: `Need ${request.requiredWorkers} workers but only ${userWorkers.length} available.`,
          suggestions: ['Reduce worker requirements', 'Add more workers to your team'],
          actions: [
            { label: 'Add Workers', action: 'navigate', data: '/dashboard/team' }
          ]
        })
        return { valid: false, issues }
      }

      // Check worker schedules if workers table has data
      // Parse date properly to avoid timezone issues
      const [year, month, day] = request.scheduledDate.split('-').map(Number)
      const requestedDate = new Date(year, month - 1, day)
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][requestedDate.getDay()]
      
      let workersWithSchedules = workers.filter(worker => 
        userWorkers.some(user => user.id === worker.user_id)
      )

      // If no workers have schedules set up, provide different guidance
      if (workersWithSchedules.length === 0) {
        issues.push({
          type: 'warning',
          code: 'NO_WORKER_SCHEDULES',
          title: 'Worker Schedules Not Set Up',
          message: 'Workers need their schedules configured before jobs can be assigned.',
          suggestions: [
            'Set up worker schedules first',
            'Go to Workers section to configure availability',
            'Jobs can still be created but will need manual assignment'
          ],
          actions: [
            { label: 'Manage Workers', action: 'navigate', data: '/dashboard/workers' }
          ]
        })

        // Still allow job creation with a warning
        issues.push({
          type: 'info',
          code: 'MANUAL_ASSIGNMENT_NEEDED',
          title: 'Manual Assignment Required',
          message: `${userWorkers.length} workers available but schedules need to be configured.`,
          suggestions: ['Job can be created and workers assigned manually later']
        })

        return { valid: true, issues }
      }

      // Check which workers are working during the requested time
      const availableWorkers = workersWithSchedules.filter(worker => {
        if (!worker.default_schedule) return false
        
        const daySchedule = worker.default_schedule[dayOfWeek]
        if (!daySchedule || !daySchedule.available) return false
        
        // Check if the requested time overlaps with worker's schedule
        const workerStart = daySchedule.start // e.g., "09:00"
        const workerEnd = daySchedule.end     // e.g., "17:00"
        
        // Convert to minutes for easier comparison
        const workerStartMinutes = this.timeToMinutes(workerStart)
        const workerEndMinutes = this.timeToMinutes(workerEnd)
        const requestStartMinutes = this.timeToMinutes(request.startTime)
        const requestEndMinutes = this.timeToMinutes(request.endTime)
        
        // Check if requested time is within worker's schedule
        return requestStartMinutes >= workerStartMinutes && requestEndMinutes <= workerEndMinutes
      })

      const availableCount = availableWorkers.length

      // Check for conflicts with existing jobs
      const requestStartDateTime = new Date(`${request.scheduledDate}T${request.startTime}:00`)
      const requestEndDateTime = new Date(`${request.scheduledDate}T${request.endTime}:00`)

      const { data: conflictingJobs, error: conflictError } = await this.supabase
        .from('jobs')
        .select('id, job_type, assigned_worker_id, start_time, end_time')
        .eq('team_id', request.teamId)
        .neq('status', 'COMPLETED')
        .neq('status', 'CANCELLED')
        .not('start_time', 'is', null)
        .not('end_time', 'is', null)

      let conflictingWorkerIds = new Set()
      if (!conflictError && conflictingJobs) {
        conflictingJobs.forEach(job => {
          if (job.assigned_worker_id && job.start_time && job.end_time) {
            const jobStart = new Date(job.start_time)
            const jobEnd = new Date(job.end_time)
            
            // Check for time overlap
            if (requestStartDateTime < jobEnd && requestEndDateTime > jobStart) {
              conflictingWorkerIds.add(job.assigned_worker_id)
            }
          }
        })
      }

      const finalAvailableCount = availableWorkers.filter(worker => 
        !conflictingWorkerIds.has(worker.user_id)
      ).length

      // Generate helpful suggestions based on actual worker schedules
      const { earliestTime, latestTime, suggestedTimes } = this.generateTimeRecommendations(workersWithSchedules, dayOfWeek)

      if (finalAvailableCount < request.requiredWorkers) {
        if (finalAvailableCount === 0) {
          const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][requestedDate.getDay()]
          
          // Check if any workers work on this day at all
          const workersAvailableThisDay = workersWithSchedules.filter(worker => {
            const daySchedule = worker.default_schedule?.[dayOfWeek]
            return daySchedule?.available
          }).length

          let message: string
          let suggestions: string[]

          if (workersAvailableThisDay === 0) {
            // This should be handled as an info/tip, not an error
            issues.push({
              type: 'info',
              code: 'NO_WORKERS_THIS_DAY',
              title: 'No Workers Scheduled',
              message: `No workers are scheduled to work on ${dayName}s.`,
              suggestions: [
                'Try a different day of the week',
                'Update worker schedules to include this day',
                'Check worker availability settings'
              ]
            })
            return { valid: false, issues } // Still prevent job creation
          } else {
            message = `No workers available during ${request.startTime}-${request.endTime} on ${dayName}.`
            suggestions = suggestedTimes.length > 0 ? [
              `Try these times when workers are available: ${suggestedTimes.slice(0, 3).join(', ')}`,
              earliestTime && latestTime ? `Workers typically available ${earliestTime}-${latestTime}` : 'Check worker schedules',
              'Choose a different date'
            ] : [
              'Check worker schedules in the Workers section',
              'Ensure workers have availability set for this day',
              'Choose a different date'
            ]
          }
            issues.push({
              type: 'error',
              code: 'NO_AVAILABLE_WORKERS',
              title: 'No Workers Available',
              message,
              suggestions
            })
        } else {
          issues.push({
            type: 'warning',
            code: 'LIMITED_AVAILABILITY',
            title: 'Limited Worker Availability',
            message: `Only ${finalAvailableCount} workers available during ${request.startTime}-${request.endTime}. Need ${request.requiredWorkers}.`,
            suggestions: [
              'Reduce worker requirements',
              ...(suggestedTimes.length > 0 ? [`Try these better times: ${suggestedTimes.slice(0, 2).join(', ')}`] : []),
              'Adjust timing to avoid conflicts'
            ]
          })
        }
      } else {
        // Success case
        issues.push({
          type: 'info',
          code: 'GOOD_AVAILABILITY',
          title: 'Workers Available',
          message: `${finalAvailableCount} workers available during ${request.startTime}-${request.endTime}.`,
          suggestions: []
        })
      }

      // Add helpful timing info
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][requestedDate.getDay()]
      
      if (earliestTime && latestTime) {
        // Only show if times are different from default business hours
        if (earliestTime !== '09:00' || latestTime !== '17:00') {
          issues.push({
            type: 'info',
            code: 'TEAM_WORKING_HOURS',
            title: 'Team Working Hours',
            message: `Workers typically available ${earliestTime}-${latestTime} on ${dayName}s.`,
            suggestions: []
          })
        }
      } else if (workersWithSchedules.length > 0) {
        // Workers exist but none work on this day
        issues.push({
          type: 'info',
          code: 'NO_WORKERS_THIS_DAY',
          title: 'No Workers Scheduled',
          message: `No workers are scheduled to work on ${dayName}s.`,
          suggestions: ['Try a different day of the week', 'Update worker schedules to include this day']
        })
      }

      return { valid: issues.filter(i => i.type === 'error').length === 0, issues }

    } catch (error) {
      console.error('Error checking worker availability:', error)
      issues.push({
        type: 'error',
        code: 'AVAILABILITY_CHECK_FAILED',
        title: 'Availability Check Failed',
        message: 'Unable to check worker availability.',
        suggestions: ['Try again', 'Contact support if this persists']
      })
      return { valid: false, issues }
    }
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  private generateTimeRecommendations(workers: any[], dayOfWeek: string): { earliestTime: string | null, latestTime: string | null, suggestedTimes: string[] } {
    const availableSlots = new Set<number>()
    let earliestMinutes = 1440 // 24 hours in minutes
    let latestMinutes = 0

    workers.forEach(worker => {
      const schedule = worker.default_schedule?.[dayOfWeek]
      if (schedule?.available && schedule.start && schedule.end) {
        const startMinutes = this.timeToMinutes(schedule.start)
        const endMinutes = this.timeToMinutes(schedule.end)
        
        earliestMinutes = Math.min(earliestMinutes, startMinutes)
        latestMinutes = Math.max(latestMinutes, endMinutes)

        // Generate hourly slots
        for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
          availableSlots.add(minutes)
        }
      }
    })

    const suggestedTimes = Array.from(availableSlots)
      .sort((a, b) => a - b)
      .slice(0, 6)
      .map(minutes => this.minutesToTime(minutes))

    return {
      earliestTime: earliestMinutes < 1440 ? this.minutesToTime(earliestMinutes) : null,
      latestTime: latestMinutes > 0 ? this.minutesToTime(latestMinutes) : null,
      suggestedTimes
    }
  }

  private getEarliestWorkerTime(workers: any[], dayOfWeek: string): string {
    let earliest = '23:59'
    let foundAny = false
    
    workers.forEach(worker => {
      const schedule = worker.workers[0]?.default_schedule?.[dayOfWeek]
      if (schedule?.available && schedule.start) {
        foundAny = true
        if (schedule.start < earliest) {
          earliest = schedule.start
        }
      }
    })
    
    // Return reasonable default if no schedules found
    return foundAny ? earliest : '09:00'
  }

  private getLatestWorkerTime(workers: any[], dayOfWeek: string): string {
    let latest = '00:00'
    let foundAny = false
    
    workers.forEach(worker => {
      const schedule = worker.workers[0]?.default_schedule?.[dayOfWeek]
      if (schedule?.available && schedule.end) {
        foundAny = true
        if (schedule.end > latest) {
          latest = schedule.end
        }
      }
    })
    
    // Return reasonable default if no schedules found
    return foundAny ? latest : '17:00'
  }

  private getTeamWorkingHours(workers: any[], dayOfWeek: string): { earliest: string | null, latest: string | null } {
    const workingWorkers = workers.filter(worker => {
      const schedule = worker.workers[0]?.default_schedule?.[dayOfWeek]
      return schedule?.available
    })

    if (workingWorkers.length === 0) return { earliest: null, latest: null }

    return {
      earliest: this.getEarliestWorkerTime(workers, dayOfWeek),
      latest: this.getLatestWorkerTime(workers, dayOfWeek)
    }
  }

  private async validateWorkerRoles(request: JobSchedulingRequest): Promise<{ valid: boolean, issues: SchedulingIssue[] }> {
    const issues: SchedulingIssue[] = []

    if (!request.requiredRoles || request.requiredRoles.length === 0) {
      issues.push({
        type: 'warning',
        code: 'NO_ROLE_REQUIREMENTS',
        title: 'No Role Requirements',
        message: 'No specific roles required for this job.',
        suggestions: ['Consider specifying required roles for better worker matching']
      })
      return { valid: true, issues }
    }

    try {
      // Check if workers have required roles
      for (const roleId of request.requiredRoles) {
        const { data: workersWithRole, error } = await this.supabase
          .from('worker_capabilities')
          .select('worker_id')
          .eq('job_role_id', roleId)
          .eq('is_active', true)

        if (error) throw error

        if (!workersWithRole || workersWithRole.length === 0) {
          const { data: roleInfo } = await this.supabase
            .from('job_roles')
            .select('name')
            .eq('id', roleId)
            .single()

          issues.push({
            type: 'error',
            code: 'NO_WORKERS_WITH_ROLE',
            title: `❌ ${roleInfo?.name || 'Unknown Role'}: No workers assigned to this role`,
            message: `No workers are currently assigned to the ${roleInfo?.name || 'Unknown Role'} role, making job creation impossible.`,
            suggestions: [
              'Assign workers to this role in Workers section',
              'Remove this role requirement from the job',
              'Train existing workers for this role'
            ],
            actions: [
              { label: 'Manage Worker Roles', action: 'navigate', data: '/dashboard/workers' },
              { label: 'Manage Roles', action: 'navigate', data: '/dashboard/roles' }
            ]
          })
        }
      }

      return { valid: issues.filter(i => i.type === 'error').length === 0, issues }

    } catch (error) {
      console.error('❌ INTELLIGENT SCHEDULING - validateWorkerRoles CATCH ERROR:', {
        error_message: error.message,
        error_stack: error.stack,
        request_context: {
          team_id: request.teamId,
          required_roles: request.requiredRoles,
          scheduled_date: request.scheduledDate,
          worker_count: request.requiredWorkers
        }
      })
      issues.push({
        type: 'error',
        code: 'ROLE_VALIDATION_FAILED',
        title: 'Role Validation Failed',
        message: 'Unable to validate worker roles.',
        suggestions: ['Try again', 'Contact support']
      })
      return { valid: false, issues }
    }
  }

  private async checkSchedulingConflicts(request: JobSchedulingRequest): Promise<{ valid: boolean, issues: SchedulingIssue[] }> {
    // This check is now handled in checkWorkerAvailability
    // Returning success to avoid double-checking
    return { valid: true, issues: [] }
  }

  private async validatePayRates(request: JobSchedulingRequest): Promise<{ valid: boolean, issues: SchedulingIssue[] }> {
    const issues: SchedulingIssue[] = []

    try {
      // Get workers with invalid pay rates
      const { data: workersWithIssues, error } = await this.supabase
        .from('users')
        .select('id, name, hourly_rate')
        .eq('team_id', request.teamId)
        .eq('role', 'worker')
        .eq('is_active', true)

      if (error) throw error

      const invalidWorkers = workersWithIssues?.filter(worker => {
        return !worker.hourly_rate || worker.hourly_rate <= 0
      }) || []

      if (invalidWorkers.length > 0) {
        issues.push({
          type: 'warning',
          code: 'INVALID_PAY_RATES',
          title: 'Workers Need Pay Rate Setup',
          message: `${invalidWorkers.length} worker(s) need hourly rate configuration.`,
          suggestions: [
            'Set up hourly rates before scheduling',
            'Configure pay rates for all workers'
          ],
          actions: [
            { label: 'Manage Pay Rates', action: 'navigate', data: '/dashboard/workers' }
          ]
        })
      }

      return { valid: true, issues } // Pay rate issues are warnings, not errors

    } catch (error) {
      console.error('Error validating pay rates:', error)
      return { valid: true, issues } // Don't block on pay rate validation failures
    }
  }

  private async generateSchedulingSuggestions(request: JobSchedulingRequest): Promise<SchedulingSuggestions> {
    try {
      // Generate suggestions based on worker schedules
      // Parse date properly to avoid timezone issues
      const [year, month, day] = request.scheduledDate.split('-').map(Number)
      const requestedDate = new Date(year, month - 1, day)
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][requestedDate.getDay()]
      
      // Get workers with their schedules
      const { data: workersData, error } = await this.supabase
        .from('users')
        .select(`
          workers!inner(default_schedule, is_active)
        `)
        .eq('team_id', request.teamId)
        .eq('role', 'worker')
        .eq('is_active', true)
        .eq('workers.is_active', true)

      if (error) throw error

      const workingHours = new Set<string>()
      const workers = workersData || []

      // Collect all working hours from workers
      workers.forEach(worker => {
        const schedule = worker.workers[0]?.default_schedule?.[dayOfWeek]
        if (schedule?.available) {
          // Generate time slots every hour between start and end
          const start = parseInt(schedule.start.split(':')[0])
          const end = parseInt(schedule.end.split(':')[0])
          
          for (let hour = start; hour < end; hour++) {
            const timeSlot = `${hour.toString().padStart(2, '0')}:00`
            workingHours.add(timeSlot)
          }
        }
      })

      // Convert to available slots with 2-hour default duration
      const available_slots = Array.from(workingHours)
        .sort()
        .slice(0, 8) // Limit to 8 suggestions
        .map(start => {
          const startHour = parseInt(start.split(':')[0])
          const endHour = Math.min(startHour + 2, 18) // Max 6 PM
          const end = `${endHour.toString().padStart(2, '0')}:00`
          return `${start} - ${end}`
        })

      const best_times = available_slots.slice(0, 3) // Top 3 recommendations

      return { available_slots, best_times }

    } catch (error) {
      console.error('Error generating scheduling suggestions:', error)
      return { available_slots: [], best_times: [] }
    }
  }

  private async calculatePayEstimate(request: JobSchedulingRequest): Promise<any> {
    try {
      // Calculate estimated duration
      const start = new Date(`2000-01-01T${request.startTime}:00`)
      const end = new Date(`2000-01-01T${request.endTime}:00`)
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

      // Get available workers and their pay rates
      const { data: workers, error } = await this.supabase
        .from('users')
        .select('id, name, hourly_rate')
        .eq('team_id', request.teamId)
        .eq('role', 'worker')
        .eq('is_active', true)
        .limit(request.requiredWorkers)

      if (error) throw error

      let totalCost = 0
      const workerCosts = (workers || []).map(worker => {
        const effectiveRate = worker.hourly_rate || 25 // Default rate

        const cost = effectiveRate * durationHours

        totalCost += cost

        return {
          workerId: worker.id,
          workerName: worker.name,
          hourlyRate: effectiveRate,
          cost
        }
      })

      return {
        totalCost,
        workerCosts
      }

    } catch (error) {
      console.error('Error calculating pay estimate:', error)
      return null
    }
  }

  /**
   * Validates worker-role matching with strict criteria
   * Ensures ALL required roles have qualified, available workers
   */
  async validateWorkerRoleMatching(request: JobSchedulingRequest): Promise<RoleValidationResult> {
    const result: RoleValidationResult = {
      valid: true,
      roles: [],
      overallIssues: []
    }

    if (!request.requiredRoles || request.requiredRoles.length === 0) {
      result.overallIssues.push({
        type: 'warning',
        code: 'NO_ROLE_REQUIREMENTS',
        title: 'No Role Requirements',
        message: 'No specific roles required for this job.',
        suggestions: ['Consider specifying required roles for better worker matching']
      })
      return result
    }

    try {
      // Parse job date and time for availability checking
      const jobDate = new Date(request.scheduledDate)
      const [startHour, startMinute] = request.startTime.split(':').map(Number)
      const [endHour, endMinute] = request.endTime.split(':').map(Number)
      
      const jobStartTime = new Date(jobDate)
      jobStartTime.setHours(startHour, startMinute, 0, 0)
      
      const jobEndTime = new Date(jobDate)
      jobEndTime.setHours(endHour, endMinute, 0, 0)

      // Validate each required role
      for (const roleId of request.requiredRoles) {
        const roleResult = await this.validateSingleRole(roleId, request, jobStartTime, jobEndTime)
        result.roles.push(roleResult)
        
        if (roleResult.status !== 'covered') {
          result.valid = false
        }
      }

      // Add overall validation issues
      if (!result.valid) {
        result.overallIssues.push({
          type: 'error',
          code: 'INCOMPLETE_ROLE_COVERAGE',
          title: 'Incomplete Role Coverage',
          message: 'Not all required roles have qualified, available workers.',
          suggestions: [
            'Assign more workers to uncovered roles',
            'Adjust job timing to when workers are available',
            'Remove uncovered role requirements'
          ]
        })
      }

      return result

    } catch (error) {
      console.error('❌ INTELLIGENT SCHEDULING - validateWorkerRoleMatching CATCH ERROR:', {
        error_message: error.message,
        error_stack: error.stack,
        request_context: {
          team_id: request.teamId,
          required_roles: request.requiredRoles,
          scheduled_date: request.scheduledDate,
          start_time: request.startTime,
          end_time: request.endTime
        }
      })
      result.valid = false
      result.overallIssues.push({
        type: 'error',
        code: 'ROLE_MATCHING_VALIDATION_FAILED',
        title: 'Role Validation Failed',
        message: 'Unable to validate worker-role matching.',
        suggestions: ['Try again', 'Contact support']
      })
      return result
    }
  }

  private async validateSingleRole(
    roleId: string, 
    request: JobSchedulingRequest, 
    jobStartTime: Date, 
    jobEndTime: Date
  ) {

    // Validate that teamId is provided
    if (!request.teamId) {
      console.error('❌ INTELLIGENT SCHEDULING - No teamId provided in request')
      return {
        roleId,
        roleName: 'Unknown Role',
        status: 'no_workers' as const,
        requiredWorkers: 1,
        availableWorkers: [],
        issues: [{
          type: 'error' as const,
          code: 'MISSING_TEAM_ID',
          title: 'Missing Team ID',
          message: 'Unable to validate role - no team ID provided.',
          suggestions: ['Refresh the page', 'Contact support']
        }],
        suggestions: []
      }
    }

    // Get role information
    const { data: roleInfo, error: roleError } = await this.supabase
      .from('job_roles')
      .select('name')
      .eq('id', roleId)
      .single()


    if (roleError || !roleInfo) {
      console.error('❌ ROLE NOT FOUND:', { roleId, roleError })
      return {
        roleId,
        roleName: 'Unknown Role',
        status: 'no_workers' as const,
        requiredWorkers: 1,
        availableWorkers: [],
        issues: [{
          type: 'error' as const,
          code: 'ROLE_NOT_FOUND',
          title: 'Role Not Found',
          message: 'Unable to find role information.',
          suggestions: ['Verify role exists', 'Contact support']
        }],
        suggestions: []
      }
    }


    // Get all workers with this role in the team
    const { data: capabilityData, error: workersError } = await this.supabase
      .from('worker_capabilities')
      .select('worker_id')
      .eq('job_role_id', roleId)
      .eq('is_active', true)


    if (workersError) {
      return {
        roleId,
        roleName: roleInfo?.name || 'Unknown Role',
        status: 'no_workers' as const,
        requiredWorkers: 1,
        availableWorkers: [],
        issues: [{
          type: 'error' as const,
          code: 'WORKER_QUERY_FAILED',
          title: 'Worker Query Failed',
          message: 'Unable to retrieve workers for this role.',
          suggestions: ['Try again', 'Contact support']
        }],
        suggestions: []
      }
    }

    if (!capabilityData || capabilityData.length === 0) {
      return {
        roleId,
        roleName: roleInfo?.name || 'Unknown Role',
        status: 'no_workers' as const,
        requiredWorkers: 1,
        availableWorkers: [],
        issues: [{
          type: 'error' as const,
          code: 'NO_WORKERS_WITH_ROLE',
          title: `No workers with ${roleInfo?.name || 'Unknown Role'} capability`,
          message: `No workers are currently assigned the ${roleInfo?.name || 'Unknown Role'} role.`,
          suggestions: ['Assign workers to this role', 'Train existing workers']
        }],
        suggestions: []
      }
    }

    // Get user details for workers with this capability
    const workerIds = capabilityData.map(c => c.worker_id)
    const { data: workersWithRole, error: usersError } = await this.supabase
      .from('users')
      .select('id, name, hourly_rate, is_active, team_id')
      .in('id', workerIds)
      .eq('team_id', request.teamId)
      .eq('is_active', true)

    if (usersError) {
      return {
        roleId,
        roleName: roleInfo?.name || 'Unknown Role',
        status: 'no_workers' as const,
        requiredWorkers: 1,
        availableWorkers: [],
        issues: [{
          type: 'error' as const,
          code: 'WORKER_QUERY_FAILED',
          title: 'Worker Query Failed',
          message: 'Unable to retrieve workers for this role.',
          suggestions: ['Try again', 'Contact support']
        }],
        suggestions: []
      }
    }

    const workers = workersWithRole || []

    // Check if no workers assigned to this role
    if (workers.length === 0) {
      return {
        roleId,
        roleName: roleInfo?.name || 'Unknown Role',
        status: 'no_workers' as const,
        requiredWorkers: 1,
        availableWorkers: [],
        issues: [{
          type: 'error' as const,
          code: 'NO_WORKERS_WITH_ROLE',
          title: 'No Workers for Role',
          message: `No workers assigned to ${roleInfo?.name || 'Unknown Role'} role.`,
          suggestions: [
            'Assign workers to this role in Workers section',
            'Remove this role requirement',
            'Train existing workers for this role'
          ]
        }],
        suggestions: [
          'Assign workers to this role in Workers section',
          'Remove this role requirement',
          'Train existing workers for this role'
        ]
      }
    }

    // Check availability for each worker
    const availableWorkers = []
    const dayOfWeek = jobStartTime.getDay() // 0 = Sunday, 1 = Monday, etc.
    const jobDayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]

    for (const assignment of workers) {
      const worker = assignment
      
      // Check if worker has availability data
      const { data: workerData, error: workerError } = await this.supabase
        .from('workers')
        .select('default_schedule')
        .eq('user_id', worker.id)
        .single()

      let isAvailable = true

      if (!workerError && workerData?.default_schedule) {
        const schedule = workerData.default_schedule as any
        const daySchedule = schedule[jobDayName]
        
        if (daySchedule && typeof daySchedule === 'object') {
          isAvailable = daySchedule.available === true
          
          // Additional time slot checking could be added here
          // For now, we're just checking if they work on this day
        }
      }

      // Check for job conflicts
      if (isAvailable) {
        const { data: conflicts } = await this.supabase
          .from('jobs')
          .select('id')
          .eq('team_id', request.teamId)
          .overlaps('assigned_worker_ids', [worker.id])
          .gte('end_time', jobStartTime.toISOString())
          .lte('start_time', jobEndTime.toISOString())

        if (conflicts && conflicts.length > 0) {
          isAvailable = false
        }
      }

      availableWorkers.push({
        workerId: worker.id,
        workerName: worker.name,
        isAvailable,
        hourlyRate: worker.hourly_rate || 0
      })
    }

    const actuallyAvailable = availableWorkers.filter(w => w.isAvailable)

    // Determine status based on availability
    let status: 'covered' | 'no_workers' | 'insufficient' | 'unavailable'
    const issues: SchedulingIssue[] = []
    const suggestions: string[] = []

    if (actuallyAvailable.length === 0) {
      status = 'unavailable'
      issues.push({
        type: 'error',
        code: 'NO_AVAILABLE_WORKERS',
        title: `⚠️ ${roleInfo?.name || 'Unknown Role'}: ${workers.length} worker(s) assigned, but none available ${request.startTime}-${request.endTime}`,
        message: `Workers exist for this role but are unavailable during the scheduled time.`,
        suggestions: [
          `Try these times: Check alternative time slots when workers are available`,
          'Reschedule conflicting jobs',
          'Add more workers to this role'
        ]
      })
      suggestions.push(
        'Try different time slots',
        'Reschedule conflicting jobs',
        'Add more workers to this role'
      )
    } else if (actuallyAvailable.length < request.requiredWorkers) {
      status = 'insufficient'
      issues.push({
        type: 'error',
        code: 'INSUFFICIENT_WORKERS',
        title: `❌ ${roleInfo?.name || 'Unknown Role'}: Need ${request.requiredWorkers} worker(s), only ${actuallyAvailable.length} qualified`,
        message: `Insufficient qualified workers available for this role.`,
        suggestions: [
          `Reduce worker requirements to ${actuallyAvailable.length}`,
          'Train more workers for this role',
          'Split job into multiple smaller jobs'
        ]
      })
      suggestions.push(
        `Reduce worker requirements to ${actuallyAvailable.length}`,
        'Train more workers for this role',
        'Split job into multiple smaller jobs'
      )
    } else {
      status = 'covered'
    }

    return {
      roleId,
      roleName: roleInfo?.name || 'Unknown Role',
      status,
      requiredWorkers: request.requiredWorkers,
      availableWorkers,
      issues,
      suggestions
    }
  }
}

// Export singleton instance
export const intelligentScheduler = new IntelligentScheduler()