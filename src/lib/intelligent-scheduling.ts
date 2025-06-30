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
    const jobDate = new Date(request.scheduledDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (jobDate < today) {
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
      // Get total active workers in team
      const { data: allWorkers, error: workersError } = await this.supabase
        .from('users')
        .select('id, name, role')
        .eq('team_id', request.teamId)
        .eq('role', 'worker')
        .eq('is_active', true)

      if (workersError) throw workersError

      const totalWorkers = allWorkers?.length || 0

      if (totalWorkers === 0) {
        issues.push({
          type: 'error',
          code: 'NO_WORKERS',
          title: 'No Workers Available',
          message: 'Your team has no active workers.',
          suggestions: ['Add workers to your team', 'Activate existing workers'],
          actions: [
            { label: 'Add Worker', action: 'navigate', data: '/dashboard/team' }
          ]
        })
        return { valid: false, issues }
      }

      if (request.requiredWorkers > totalWorkers) {
        issues.push({
          type: 'error',
          code: 'INSUFFICIENT_WORKERS',
          title: 'Not Enough Workers',
          message: `Need ${request.requiredWorkers} workers but only ${totalWorkers} available.`,
          suggestions: ['Reduce worker requirements', 'Add more workers to your team'],
          actions: [
            { label: 'Add Workers', action: 'navigate', data: '/dashboard/team' }
          ]
        })
        return { valid: false, issues }
      }

      // Check for scheduling conflicts
      const { data: conflictingJobs, error: conflictError } = await this.supabase
        .from('jobs')
        .select('id, job_type, assigned_worker_id')
        .eq('team_id', request.teamId)
        .eq('scheduled_date', request.scheduledDate)
        .neq('status', 'COMPLETED')
        .neq('status', 'CANCELLED')

      if (conflictError) throw conflictError

      const conflictingWorkers = new Set()
      conflictingJobs?.forEach(job => {
        if (job.assigned_worker_id) {
          conflictingWorkers.add(job.assigned_worker_id)
        }
      })

      const availableWorkers = totalWorkers - conflictingWorkers.size

      if (availableWorkers < request.requiredWorkers) {
        issues.push({
          type: 'warning',
          code: 'LIMITED_AVAILABILITY',
          title: 'Limited Worker Availability',
          message: `Only ${availableWorkers} workers available due to scheduling conflicts.`,
          suggestions: [
            'Reschedule to a different time',
            'Consider different date',
            'Reduce worker requirements'
          ]
        })
      }

      // Success case - provide positive feedback
      if (availableWorkers >= request.requiredWorkers && issues.length === 0) {
        issues.push({
          type: 'info',
          code: 'GOOD_AVAILABILITY',
          title: 'Good Availability',
          message: `${availableWorkers} workers available for this time slot.`,
          suggestions: []
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
        suggestions: ['Try again', 'Contact support']
      })
      return { valid: false, issues }
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
          .from('worker_role_assignments')
          .select(`
            worker_id,
            worker:users(name, is_active)
          `)
          .eq('job_role_id', roleId)

        if (error) throw error

        const activeWorkersWithRole = workersWithRole?.filter(
          assignment => assignment.worker?.is_active
        ) || []

        if (activeWorkersWithRole.length === 0) {
          const { data: roleInfo } = await this.supabase
            .from('job_roles')
            .select('name')
            .eq('id', roleId)
            .single()

          issues.push({
            type: 'error',
            code: 'NO_WORKERS_WITH_ROLE',
            title: 'Missing Required Role',
            message: `No workers assigned to required role: ${roleInfo?.name || 'Unknown Role'}`,
            suggestions: [
              'Assign workers to this role',
              'Remove role requirement',
              'Train existing workers for this role'
            ],
            actions: [
              { label: 'Manage Roles', action: 'navigate', data: '/dashboard/roles' }
            ]
          })
        }
      }

      return { valid: issues.filter(i => i.type === 'error').length === 0, issues }

    } catch (error) {
      console.error('Error validating worker roles:', error)
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
    const issues: SchedulingIssue[] = []

    try {
      // Use the database function for validation
      const { data: validationResult, error } = await this.supabase
        .rpc('validate_job_scheduling', {
          p_scheduled_date: request.scheduledDate,
          p_start_time: request.startTime,
          p_end_time: request.endTime,
          p_team_id: request.teamId,
          p_required_workers: request.requiredWorkers
        })

      if (error) throw error

      const result = validationResult as SchedulingValidation

      if (!result.valid) {
        if (result.available_workers === 0) {
          issues.push({
            type: 'error',
            code: 'NO_AVAILABLE_WORKERS',
            title: 'All Workers Busy',
            message: `All workers are busy during this time. ${result.conflicts} conflicting job(s).`,
            suggestions: result.suggestions || [
              'Try a different time',
              'Reschedule existing jobs',
              'Add more workers to your team'
            ]
          })
        } else {
          issues.push({
            type: 'warning',
            code: 'PARTIAL_CONFLICTS',
            title: 'Some Workers Unavailable',
            message: `Only ${result.available_workers} of ${result.total_workers} workers available.`,
            suggestions: [
              'Reduce worker requirements',
              'Adjust timing to avoid conflicts'
            ]
          })
        }
      }

      return { valid: result.valid, issues }

    } catch (error) {
      console.error('Error checking scheduling conflicts:', error)
      issues.push({
        type: 'warning',
        code: 'CONFLICT_CHECK_FAILED',
        title: 'Conflict Check Failed',
        message: 'Unable to check for scheduling conflicts.',
        suggestions: ['Manual verification recommended']
      })
      return { valid: true, issues } // Don't block on technical failures
    }
  }

  private async validatePayRates(request: JobSchedulingRequest): Promise<{ valid: boolean, issues: SchedulingIssue[] }> {
    const issues: SchedulingIssue[] = []

    try {
      // Get workers with invalid pay rates
      const { data: workersWithIssues, error } = await this.supabase
        .from('users')
        .select('id, name, hourly_rate, salary_type, salary_amount')
        .eq('team_id', request.teamId)
        .eq('role', 'worker')
        .eq('is_active', true)

      if (error) throw error

      const invalidWorkers = workersWithIssues?.filter(worker => {
        if (worker.salary_type === 'hourly' && (!worker.hourly_rate || worker.hourly_rate <= 0)) {
          return true
        }
        if (worker.salary_type === 'salary' && (!worker.salary_amount || worker.salary_amount <= 0)) {
          return true
        }
        return false
      }) || []

      if (invalidWorkers.length > 0) {
        issues.push({
          type: 'warning',
          code: 'INVALID_PAY_RATES',
          title: 'Workers Need Pay Rate Setup',
          message: `${invalidWorkers.length} worker(s) need pay rate configuration.`,
          suggestions: [
            'Set up pay rates before scheduling',
            'Configure hourly rates or salaries for all workers'
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
      const { data: suggestionsResult, error } = await this.supabase
        .rpc('get_scheduling_suggestions', {
          p_team_id: request.teamId,
          p_date: request.scheduledDate,
          p_required_workers: request.requiredWorkers
        })

      if (error) throw error

      return suggestionsResult as SchedulingSuggestions || { available_slots: [], best_times: [] }

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
        .select('id, name, hourly_rate, salary_type, salary_amount')
        .eq('team_id', request.teamId)
        .eq('role', 'worker')
        .eq('is_active', true)
        .limit(request.requiredWorkers)

      if (error) throw error

      let totalCost = 0
      const workerCosts = (workers || []).map(worker => {
        const effectiveRate = worker.salary_type === 'salary' 
          ? (worker.salary_amount || 0) / (40 * 52) // Convert annual to hourly
          : worker.hourly_rate || 0

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
}

// Export singleton instance
export const intelligentScheduler = new IntelligentScheduler()