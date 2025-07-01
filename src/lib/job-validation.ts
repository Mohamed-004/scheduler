/**
 * Comprehensive Job Validation Engine
 * Handles all possible error scenarios for job creation with detailed feedback
 */

import { createClient } from '@/lib/supabase/client'
import { findAvailableWorkers, checkWorkerAvailability, type TimeSlot, type JobRequirement } from '@/lib/worker-availability'

export interface JobValidationRequest {
  teamId: string
  clientId: string
  jobType: string
  address: string
  estimatedHours: number
  quoteAmount: number
  startTime?: Date
  endTime?: Date
  roleRequirements: JobRequirement[]
  equipmentRequired?: string[]
  notes?: string
}

export interface ValidationError {
  type: 'critical' | 'warning' | 'info'
  code: string
  title: string
  message: string
  details?: string
  recommendations: string[]
  quickActions: QuickAction[]
  affectedField?: string
}

export interface QuickAction {
  type: 'navigate' | 'modal' | 'api_call' | 'external'
  label: string
  url?: string
  action?: string
  data?: any
  priority: 'high' | 'medium' | 'low'
}

export interface ValidationResult {
  isValid: boolean
  canProceedWithWarnings: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  info: ValidationError[]
  recommendations: JobRecommendation[]
  workerAvailabilityStatus: WorkerAvailabilityStatus
}

export interface JobRecommendation {
  type: 'alternative_time' | 'hire_worker' | 'train_worker' | 'split_job' | 'use_crew' | 'adjust_requirements'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'quick' | 'moderate' | 'complex'
  action: QuickAction
  data?: any
}

export interface WorkerAvailabilityStatus {
  totalWorkersNeeded: number
  totalWorkersAvailable: number
  rolesCovered: number
  totalRoles: number
  conflictingJobs: any[]
  partiallyAvailableWorkers: any[]
  fullyAvailableWorkers: any[]
  unavailableWorkers: any[]
}

/**
 * Comprehensive job validation that checks all possible error scenarios
 */
export async function validateJobCreation(request: JobValidationRequest): Promise<ValidationResult> {
  const supabase = createClient()
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []
  const recommendations: JobRecommendation[] = []

  try {
    // 1. Team Setup Validation
    const teamValidation = await validateTeamSetup(request.teamId, supabase)
    errors.push(...teamValidation.errors)
    warnings.push(...teamValidation.warnings)
    info.push(...teamValidation.info)
    recommendations.push(...teamValidation.recommendations)

    // 2. Role Requirements Validation
    const roleValidation = await validateRoleRequirements(request.roleRequirements, request.teamId, supabase)
    errors.push(...roleValidation.errors)
    warnings.push(...roleValidation.warnings)
    recommendations.push(...roleValidation.recommendations)

    // 3. Worker Availability Validation
    const workerAvailabilityStatus = await validateWorkerAvailability(request, supabase)
    const availabilityValidation = analyzeWorkerAvailability(workerAvailabilityStatus, request)
    errors.push(...availabilityValidation.errors)
    warnings.push(...availabilityValidation.warnings)
    info.push(...availabilityValidation.info)
    recommendations.push(...availabilityValidation.recommendations)

    // 4. Client Validation
    const clientValidation = await validateClient(request.clientId, request.teamId, supabase)
    errors.push(...clientValidation.errors)
    warnings.push(...clientValidation.warnings)

    // 5. Business Logic Validation
    const businessValidation = validateBusinessLogic(request, workerAvailabilityStatus)
    errors.push(...businessValidation.errors)
    warnings.push(...businessValidation.warnings)
    info.push(...businessValidation.info)
    recommendations.push(...businessValidation.recommendations)

    // 6. Schedule Conflict Validation
    if (request.startTime && request.endTime) {
      const scheduleValidation = await validateScheduleConflicts(request, supabase)
      errors.push(...scheduleValidation.errors)
      warnings.push(...scheduleValidation.warnings)
      recommendations.push(...scheduleValidation.recommendations)
    }

    return {
      isValid: errors.length === 0,
      canProceedWithWarnings: errors.length === 0 && warnings.length > 0,
      errors,
      warnings,
      info,
      recommendations,
      workerAvailabilityStatus
    }

  } catch (error) {
    console.error('Job validation failed:', error)
    return {
      isValid: false,
      canProceedWithWarnings: false,
      errors: [{
        type: 'critical',
        code: 'VALIDATION_SYSTEM_ERROR',
        title: 'Validation System Error',
        message: 'Unable to validate job requirements. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        recommendations: ['Try refreshing the page', 'Contact support if the problem persists'],
        quickActions: [{
          type: 'navigate',
          label: 'Refresh Page',
          action: 'refresh',
          priority: 'high'
        }]
      }],
      warnings: [],
      info: [],
      recommendations: [],
      workerAvailabilityStatus: {
        totalWorkersNeeded: 0,
        totalWorkersAvailable: 0,
        rolesCovered: 0,
        totalRoles: 0,
        conflictingJobs: [],
        partiallyAvailableWorkers: [],
        fullyAvailableWorkers: [],
        unavailableWorkers: []
      }
    }
  }
}

/**
 * Validate team setup and configuration
 */
async function validateTeamSetup(teamId: string, supabase: any) {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []
  const recommendations: JobRecommendation[] = []

  // Check if job roles exist
  const { data: jobRoles, error: rolesError } = await supabase
    .from('job_roles')
    .select('id, name, is_active')
    .eq('team_id', teamId)
    .eq('is_active', true)

  if (rolesError) {
    errors.push({
      type: 'critical',
      code: 'ROLES_FETCH_ERROR',
      title: 'Unable to Load Job Roles',
      message: 'Cannot fetch job roles for your team.',
      details: rolesError.message,
      recommendations: ['Check your internet connection', 'Contact support if the problem persists'],
      quickActions: [{
        type: 'navigate',
        label: 'Retry',
        action: 'retry',
        priority: 'high'
      }]
    })
    return { errors, warnings, info, recommendations }
  }

  if (!jobRoles || jobRoles.length === 0) {
    errors.push({
      type: 'critical',
      code: 'NO_JOB_ROLES',
      title: 'No Job Roles Configured',
      message: 'Your team hasn\'t set up any job roles yet. You need at least one role to create jobs.',
      details: 'Job roles define what types of work your team can perform (e.g., Window Cleaning, Landscaping, etc.)',
      recommendations: [
        'Add job roles for your business services',
        'Set up default roles like "General Labor" to get started quickly',
        'Contact your admin to configure job roles'
      ],
      quickActions: [{
        type: 'navigate',
        label: 'Add Job Roles',
        url: '/dashboard/roles',
        priority: 'high'
      }]
    })
    return { errors, warnings, info, recommendations }
  }

  // Check if workers exist
  const { data: workers, error: workersError } = await supabase
    .from('workers')
    .select('id, name, is_active, user:users!inner(team_id)')
    .eq('is_active', true)
    .eq('user.team_id', teamId)

  if (workersError) {
    errors.push({
      type: 'critical',
      code: 'WORKERS_FETCH_ERROR',
      title: 'Unable to Load Workers',
      message: 'Cannot fetch workers for your team.',
      details: workersError.message,
      recommendations: ['Check your internet connection', 'Contact support if the problem persists'],
      quickActions: [{
        type: 'navigate',
        label: 'Retry',
        action: 'retry',
        priority: 'high'
      }]
    })
    return { errors, warnings, info, recommendations }
  }

  if (!workers || workers.length === 0) {
    errors.push({
      type: 'critical',
      code: 'NO_WORKERS',
      title: 'No Workers in Team',
      message: 'Your team doesn\'t have any workers yet. You need workers to assign to jobs.',
      details: 'Invite team members with the "worker" role to start scheduling jobs.',
      recommendations: [
        'Invite workers to join your team',
        'Change existing team members\' roles to "worker"',
        'Add worker profiles for your team members'
      ],
      quickActions: [{
        type: 'navigate',
        label: 'Invite Workers',
        url: '/dashboard/team',
        priority: 'high'
      }]
    })
    return { errors, warnings, info, recommendations }
  }

  // Provide helpful info for new teams
  if (workers.length < 3) {
    info.push({
      type: 'info',
      code: 'SMALL_TEAM_INFO',
      title: 'Growing Your Team',
      message: `You have ${workers.length} worker${workers.length === 1 ? '' : 's'} in your team.`,
      details: 'Consider inviting more workers to handle larger jobs and provide backup coverage.',
      recommendations: [
        'Invite additional workers for job flexibility',
        'Cross-train workers on multiple roles',
        'Set up worker schedules for better planning'
      ],
      quickActions: [{
        type: 'navigate',
        label: 'Manage Team',
        url: '/dashboard/team',
        priority: 'low'
      }]
    })
  }

  return { errors, warnings, info, recommendations }
}

/**
 * Validate role requirements and worker assignments
 */
async function validateRoleRequirements(roleRequirements: JobRequirement[], teamId: string, supabase: any) {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const recommendations: JobRecommendation[] = []

  if (roleRequirements.length === 0) {
    errors.push({
      type: 'critical',
      code: 'NO_ROLE_REQUIREMENTS',
      title: 'No Job Roles Selected',
      message: 'You must specify what types of workers are needed for this job.',
      details: 'Select at least one job role and specify how many workers you need.',
      recommendations: [
        'Add at least one role requirement',
        'Consider what skills are needed for this job type',
        'Review similar jobs to see what roles were used'
      ],
      quickActions: [{
        type: 'modal',
        label: 'Add Role',
        action: 'add_role_requirement',
        priority: 'high'
      }],
      affectedField: 'roleRequirements'
    })
    return { errors, warnings, recommendations }
  }

  // Check each role requirement
  for (const [index, requirement] of roleRequirements.entries()) {
    if (!requirement.job_role_id) {
      errors.push({
        type: 'critical',
        code: 'INVALID_ROLE_REQUIREMENT',
        title: `Role #${index + 1} Not Selected`,
        message: 'Please select a job role for this requirement.',
        recommendations: ['Choose a role from the dropdown', 'Remove this requirement if not needed'],
        quickActions: [{
          type: 'modal',
          label: 'Select Role',
          action: 'edit_role_requirement',
          data: { index },
          priority: 'high'
        }],
        affectedField: `roleRequirements.${index}.job_role_id`
      })
      continue
    }

    if (requirement.quantity_required < 1) {
      errors.push({
        type: 'critical',
        code: 'INVALID_QUANTITY',
        title: `Invalid Quantity for Role #${index + 1}`,
        message: 'You must need at least 1 worker for each role.',
        recommendations: ['Set quantity to at least 1', 'Remove the role if not needed'],
        quickActions: [{
          type: 'modal',
          label: 'Fix Quantity',
          action: 'edit_role_requirement',
          data: { index },
          priority: 'high'
        }],
        affectedField: `roleRequirements.${index}.quantity_required`
      })
    }

    // Get role name for better error messages
    const { data: role } = await supabase
      .from('job_roles')
      .select('name')
      .eq('id', requirement.job_role_id)
      .single()

    const roleName = role?.name || 'this role'

    // Check if workers exist with this role
    const { data: capabilities } = await supabase
      .from('worker_capabilities')
      .select('worker_id')
      .eq('job_role_id', requirement.job_role_id)
      .eq('is_active', true)

    if (!capabilities || capabilities.length === 0) {
      warnings.push({
        type: 'warning',
        code: 'NO_WORKERS_WITH_ROLE',
        title: `No workers trained for ${roleName}`,
        message: `No workers currently have the ${roleName} capability.`,
        affectedField: `roleRequirements.${index}.job_role_id`,
        suggestions: [
          'Train existing workers for this role',
          'Hire workers with this capability',
          'Remove this role requirement'
        ]
      })
      continue
    }

    // Check if any of these workers are in the current team
    const workerIds = capabilities.map(c => c.worker_id)
    const { data: roleAssignments } = await supabase
      .from('users')
      .select('id')
      .in('id', workerIds)
      .eq('team_id', teamId)

    if (!roleAssignments || roleAssignments.length === 0) {
      warnings.push({
        type: 'warning',
        code: 'NO_WORKERS_WITH_ROLE',
        title: `No Team Workers with ${roleName}`,
        message: `None of your team workers currently have the "${roleName}" capability.`,
        details: 'You can still create the job, but you\'ll need to assign workers to this role before scheduling.',
        recommendations: [
          `Assign existing workers to the "${roleName}" role`,
          'Hire new workers with this skill set',
          'Train existing workers for this role'
        ],
        quickActions: [
          {
            type: 'navigate',
            label: 'Assign Workers to Role',
            url: '/dashboard/workers',
            priority: 'high'
          },
          {
            type: 'navigate',
            label: 'Invite New Worker',
            url: '/dashboard/team',
            priority: 'medium'
          }
        ],
        affectedField: `roleRequirements.${index}.job_role_id`
      })

      recommendations.push({
        type: 'train_worker',
        title: `Train Workers for ${roleName}`,
        description: `Consider training existing workers to perform ${roleName} tasks`,
        impact: 'medium',
        effort: 'moderate',
        action: {
          type: 'navigate',
          label: 'Manage Worker Roles',
          url: '/dashboard/workers',
          priority: 'medium'
        },
        data: { roleId: requirement.job_role_id, roleName }
      })
    }
  }

  return { errors, warnings, recommendations }
}

/**
 * Validate worker availability for the scheduled time
 */
async function validateWorkerAvailability(request: JobValidationRequest, supabase: any): Promise<WorkerAvailabilityStatus> {
  const totalRoles = request.roleRequirements.length
  const totalWorkersNeeded = request.roleRequirements.reduce((sum, req) => sum + req.quantity_required, 0)

  if (!request.startTime || !request.endTime) {
    return {
      totalWorkersNeeded,
      totalWorkersAvailable: 0,
      rolesCovered: 0,
      totalRoles,
      conflictingJobs: [],
      partiallyAvailableWorkers: [],
      fullyAvailableWorkers: [],
      unavailableWorkers: []
    }
  }

  const timeSlot: TimeSlot = {
    start: request.startTime,
    end: request.endTime
  }

  let rolesCovered = 0
  let totalWorkersAvailable = 0
  const conflictingJobs: any[] = []
  const partiallyAvailableWorkers: any[] = []
  const fullyAvailableWorkers: any[] = []
  const unavailableWorkers: any[] = []

  // Check availability for each role
  for (const requirement of request.roleRequirements) {
    const availableWorkers = await findAvailableWorkers(
      requirement.job_role_id,
      timeSlot,
      request.teamId
    )

    const fullyAvailable = availableWorkers.filter(w => w.score >= 70 && w.conflicts.length === 0)
    const partiallyAvailable = availableWorkers.filter(w => w.score >= 50 && w.conflicts.length > 0)
    const unavailable = availableWorkers.filter(w => w.score < 50 || w.conflicts.length > 0)

    if (fullyAvailable.length >= requirement.quantity_required) {
      rolesCovered++
      totalWorkersAvailable += Math.min(fullyAvailable.length, requirement.quantity_required)
    }

    fullyAvailableWorkers.push(...fullyAvailable)
    partiallyAvailableWorkers.push(...partiallyAvailable)
    unavailableWorkers.push(...unavailable)

    // Collect conflicting jobs
    availableWorkers.forEach(worker => {
      worker.conflicts.forEach(conflict => {
        if (conflict.includes('Already assigned to job:')) {
          conflictingJobs.push({
            workerId: worker.worker_id,
            workerName: worker.worker_name,
            conflict
          })
        }
      })
    })
  }

  return {
    totalWorkersNeeded,
    totalWorkersAvailable,
    rolesCovered,
    totalRoles,
    conflictingJobs: [...new Set(conflictingJobs)], // Remove duplicates
    partiallyAvailableWorkers,
    fullyAvailableWorkers,
    unavailableWorkers
  }
}

/**
 * Analyze worker availability and generate appropriate errors/warnings
 */
function analyzeWorkerAvailability(status: WorkerAvailabilityStatus, request: JobValidationRequest) {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []
  const recommendations: JobRecommendation[] = []

  if (!request.startTime || !request.endTime) {
    info.push({
      type: 'info',
      code: 'NO_SCHEDULE_INFO',
      title: 'No Schedule Specified',
      message: 'Add start and end times to check worker availability.',
      recommendations: [
        'Set a start and end time for automatic worker assignment',
        'Jobs without schedules can be assigned workers manually later'
      ],
      quickActions: [{
        type: 'modal',
        label: 'Add Schedule',
        action: 'add_schedule',
        priority: 'medium'
      }],
      affectedField: 'startTime'
    })
    return { errors, warnings, info, recommendations }
  }

  const { rolesCovered, totalRoles, totalWorkersNeeded, totalWorkersAvailable, conflictingJobs } = status

  if (rolesCovered === 0) {
    errors.push({
      type: 'critical',
      code: 'NO_WORKERS_AVAILABLE',
      title: 'No Workers Available',
      message: `No workers are available for the scheduled time (${request.startTime!.toLocaleDateString()} ${request.startTime!.toLocaleTimeString()}).`,
      details: `You need ${totalWorkersNeeded} worker${totalWorkersNeeded === 1 ? '' : 's'} but none are available.`,
      recommendations: [
        'Choose a different time when workers are available',
        'Hire additional workers or adjust their schedules',
        'Split the job across multiple time slots'
      ],
      quickActions: [
        {
          type: 'modal',
          label: 'View Alternative Times',
          action: 'show_availability_calendar',
          priority: 'high'
        },
        {
          type: 'navigate',
          label: 'Manage Worker Schedules',
          url: '/dashboard/workers',
          priority: 'medium'
        }
      ],
      affectedField: 'scheduledStart'
    })

    recommendations.push({
      type: 'alternative_time',
      title: 'Find Better Time Slot',
      description: 'Check when your workers are available and reschedule accordingly',
      impact: 'high',
      effort: 'quick',
      action: {
        type: 'modal',
        label: 'View Availability Calendar',
        action: 'show_availability_calendar',
        priority: 'high'
      }
    })
  } else if (rolesCovered < totalRoles) {
    warnings.push({
      type: 'warning',
      code: 'PARTIAL_COVERAGE',
      title: 'Partial Worker Coverage',
      message: `Only ${rolesCovered} of ${totalRoles} roles can be covered at this time.`,
      details: 'Some workers are available, but not enough to cover all required roles.',
      recommendations: [
        'Assign available workers and find coverage for remaining roles',
        'Adjust the schedule to when more workers are available',
        'Consider hiring additional workers'
      ],
      quickActions: [
        {
          type: 'modal',
          label: 'View Available Workers',
          action: 'show_available_workers',
          priority: 'high'
        },
        {
          type: 'modal',
          label: 'Find Alternative Time',
          action: 'show_availability_calendar',
          priority: 'medium'
        }
      ]
    })
  } else if (totalWorkersAvailable < totalWorkersNeeded) {
    warnings.push({
      type: 'warning',
      code: 'INSUFFICIENT_WORKERS',
      title: 'Not Enough Workers',
      message: `You need ${totalWorkersNeeded} workers but only ${totalWorkersAvailable} are available.`,
      details: 'All roles can be covered, but with fewer workers than requested.',
      recommendations: [
        'Proceed with available workers',
        'Hire additional workers',
        'Extend the job timeline to use fewer workers'
      ],
      quickActions: [
        {
          type: 'modal',
          label: 'Proceed with Available Workers',
          action: 'adjust_worker_count',
          priority: 'high'
        },
        {
          type: 'navigate',
          label: 'Invite More Workers',
          url: '/dashboard/team',
          priority: 'medium'
        }
      ]
    })
  }

  if (conflictingJobs.length > 0) {
    warnings.push({
      type: 'warning',
      code: 'SCHEDULING_CONFLICTS',
      title: 'Schedule Conflicts Detected',
      message: `${conflictingJobs.length} worker${conflictingJobs.length === 1 ? ' has' : 's have'} existing job assignments.`,
      details: 'Some workers are already booked for other jobs during this time.',
      recommendations: [
        'Reschedule this job to avoid conflicts',
        'Reassign conflicting jobs if this job has higher priority',
        'Use different workers who are available'
      ],
      quickActions: [
        {
          type: 'modal',
          label: 'View Conflicts',
          action: 'show_schedule_conflicts',
          data: { conflicts: conflictingJobs },
          priority: 'high'
        },
        {
          type: 'modal',
          label: 'Find Alternative Time',
          action: 'show_availability_calendar',
          priority: 'medium'
        }
      ]
    })
  }

  return { errors, warnings, info, recommendations }
}

/**
 * Validate client information
 */
async function validateClient(clientId: string, teamId: string, supabase: any) {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (!clientId) {
    errors.push({
      type: 'critical',
      code: 'NO_CLIENT_SELECTED',
      title: 'No Client Selected',
      message: 'You must select a client for this job.',
      recommendations: [
        'Select an existing client from the dropdown',
        'Create a new client if this is a new customer'
      ],
      quickActions: [
        {
          type: 'modal',
          label: 'Create New Client',
          action: 'create_client',
          priority: 'high'
        }
      ],
      affectedField: 'clientId'
    })
    return { errors, warnings }
  }

  // Verify client exists and belongs to team
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, phone, email')
    .eq('id', clientId)
    .eq('team_id', teamId)
    .single()

  if (clientError || !client) {
    errors.push({
      type: 'critical',
      code: 'INVALID_CLIENT',
      title: 'Invalid Client',
      message: 'The selected client is not valid or not found.',
      details: 'The client may have been deleted or you may not have permission to access it.',
      recommendations: [
        'Select a different client',
        'Create a new client record'
      ],
      quickActions: [
        {
          type: 'modal',
          label: 'Select Different Client',
          action: 'select_client',
          priority: 'high'
        },
        {
          type: 'modal',
          label: 'Create New Client',
          action: 'create_client',
          priority: 'medium'
        }
      ],
      affectedField: 'clientId'
    })
  }

  return { errors, warnings }
}

/**
 * Validate business logic and rules
 */
function validateBusinessLogic(request: JobValidationRequest, workerStatus: WorkerAvailabilityStatus) {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []
  const recommendations: JobRecommendation[] = []

  // Validate job type
  if (!request.jobType?.trim()) {
    errors.push({
      type: 'critical',
      code: 'NO_JOB_TYPE',
      title: 'Job Type Required',
      message: 'Please specify what type of job this is.',
      recommendations: [
        'Enter a job type (e.g., "Window Cleaning", "Landscaping")',
        'Use descriptive names that workers will understand'
      ],
      quickActions: [],
      affectedField: 'jobType'
    })
  }

  // Validate address
  if (!request.address?.trim()) {
    errors.push({
      type: 'critical',
      code: 'NO_ADDRESS',
      title: 'Address Required',
      message: 'Please provide the job location address.',
      recommendations: [
        'Enter the complete address where work will be performed',
        'Include city and postal code for accurate directions'
      ],
      quickActions: [],
      affectedField: 'address'
    })
  }

  // Validate estimated hours
  if (!request.estimatedHours || request.estimatedHours <= 0) {
    errors.push({
      type: 'critical',
      code: 'INVALID_HOURS',
      title: 'Invalid Estimated Hours',
      message: 'Please provide a valid estimated duration for this job.',
      recommendations: [
        'Enter the expected number of hours this job will take',
        'Consider similar jobs you\'ve done in the past'
      ],
      quickActions: [],
      affectedField: 'estimatedHours'
    })
  } else if (request.estimatedHours > 24) {
    warnings.push({
      type: 'warning',
      code: 'LONG_JOB_DURATION',
      title: 'Very Long Job Duration',
      message: `This job is estimated to take ${request.estimatedHours} hours.`,
      details: 'Consider splitting very long jobs across multiple days.',
      recommendations: [
        'Split into multiple shorter jobs',
        'Schedule across multiple days',
        'Assign multiple workers to reduce duration'
      ],
      quickActions: [
        {
          type: 'modal',
          label: 'Split into Multiple Jobs',
          action: 'split_job',
          priority: 'medium'
        }
      ],
      affectedField: 'estimatedHours'
    })

    recommendations.push({
      type: 'split_job',
      title: 'Split Long Job',
      description: 'Break this job into smaller, more manageable tasks',
      impact: 'medium',
      effort: 'moderate',
      action: {
        type: 'modal',
        label: 'Split Job',
        action: 'split_job',
        priority: 'medium'
      }
    })
  }

  // Validate quote amount
  if (!request.quoteAmount || request.quoteAmount < 0) {
    errors.push({
      type: 'critical',
      code: 'INVALID_QUOTE',
      title: 'Invalid Quote Amount',
      message: 'Please provide a valid quote amount for this job.',
      recommendations: [
        'Enter the amount you\'ll charge the client',
        'Use 0 for free jobs or quotes to be determined'
      ],
      quickActions: [],
      affectedField: 'quoteAmount'
    })
  }

  // Business logic validation for worker-to-hour ratio
  if (workerStatus.totalWorkersAvailable > 0 && request.estimatedHours > 0) {
    const hoursPerWorker = request.estimatedHours / workerStatus.totalWorkersAvailable
    
    if (hoursPerWorker < 0.5) {
      info.push({
        type: 'info',
        code: 'OVER_STAFFED',
        title: 'Job May Be Over-Staffed',
        message: `With ${workerStatus.totalWorkersAvailable} workers, this ${request.estimatedHours}h job would only need ${hoursPerWorker.toFixed(1)}h per worker.`,
        details: 'Consider reducing workers to optimize costs.',
        recommendations: [
          'Use fewer workers to reduce labor costs',
          'Combine with other nearby jobs',
          'Extend to include additional services'
        ],
        quickActions: [
          {
            type: 'modal',
            label: 'Optimize Staffing',
            action: 'optimize_workers',
            priority: 'low'
          }
        ]
      })
    } else if (hoursPerWorker > 8) {
      warnings.push({
        type: 'warning',
        code: 'UNDER_STAFFED',
        title: 'Job May Require Multiple Days',
        message: `With ${workerStatus.totalWorkersAvailable} workers, this job would require ${hoursPerWorker.toFixed(1)}h per worker.`,
        details: 'Consider adding more workers or scheduling across multiple days.',
        recommendations: [
          'Hire additional workers',
          'Split job across multiple days',
          'Extend the deadline'
        ],
        quickActions: [
          {
            type: 'navigate',
            label: 'Hire More Workers',
            url: '/dashboard/team',
            priority: 'medium'
          }
        ]
      })
    }
  }

  return { errors, warnings, info, recommendations }
}

/**
 * Validate schedule conflicts with existing jobs
 */
async function validateScheduleConflicts(request: JobValidationRequest, supabase: any) {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const recommendations: JobRecommendation[] = []

  // Check for jobs scheduled at the same time
  const { data: conflictingJobs, error } = await supabase
    .from('jobs')
    .select('id, job_type, client:clients(name), start_time, end_time')
    .eq('team_id', request.teamId)
    .gte('end_time', request.startTime!.toISOString())
    .lte('start_time', request.endTime!.toISOString())
    .neq('status', 'CANCELLED')

  if (error) {
    warnings.push({
      type: 'warning',
      code: 'CONFLICT_CHECK_FAILED',
      title: 'Unable to Check Schedule Conflicts',
      message: 'Could not verify if there are scheduling conflicts.',
      recommendations: ['Manually verify no jobs are scheduled at the same time'],
      quickActions: [{
        type: 'navigate',
        label: 'View Schedule',
        url: '/dashboard/jobs',
        priority: 'medium'
      }]
    })
    return { errors, warnings, recommendations }
  }

  if (conflictingJobs && conflictingJobs.length > 0) {
    warnings.push({
      type: 'warning',
      code: 'SCHEDULE_OVERLAP',
      title: 'Schedule Overlap Detected',
      message: `${conflictingJobs.length} other job${conflictingJobs.length === 1 ? '' : 's'} scheduled during this time.`,
      details: 'Multiple jobs at the same time may strain your resources.',
      recommendations: [
        'Verify you have enough workers for all jobs',
        'Consider rescheduling one of the jobs',
        'Ensure jobs are at different locations'
      ],
      quickActions: [
        {
          type: 'modal',
          label: 'View Conflicting Jobs',
          action: 'show_schedule_conflicts',
          data: { conflicts: conflictingJobs },
          priority: 'high'
        },
        {
          type: 'modal',
          label: 'Find Alternative Time',
          action: 'show_availability_calendar',
          priority: 'medium'
        }
      ]
    })

    recommendations.push({
      type: 'alternative_time',
      title: 'Reschedule to Avoid Conflicts',
      description: 'Find a time slot that doesn\'t conflict with existing jobs',
      impact: 'medium',
      effort: 'quick',
      action: {
        type: 'modal',
        label: 'View Alternative Times',
        action: 'show_availability_calendar',
        priority: 'high'
      },
      data: { conflictingJobs }
    })
  }

  return { errors, warnings, recommendations }
}