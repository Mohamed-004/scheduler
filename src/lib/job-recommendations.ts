/**
 * Smart Job Recommendations System
 * Generates intelligent suggestions based on validation results and current state
 */

import { createClient } from '@/lib/supabase/client'
import { findAvailableWorkers, type TimeSlot } from '@/lib/worker-availability'
import type { 
  JobValidationRequest, 
  JobRecommendation, 
  QuickAction, 
  WorkerAvailabilityStatus 
} from './job-validation'

export interface AlternativeTimeSlot {
  start: Date
  end: Date
  availableWorkers: number
  score: number
  conflicts: string[]
  reason: string
}

export interface WorkerHiringRecommendation {
  roleId: string
  roleName: string
  suggestedCount: number
  urgency: 'high' | 'medium' | 'low'
  estimatedCost: number
  timeToHire: string
  skillRequirements: string[]
}

export interface TrainingRecommendation {
  workerId: string
  workerName: string
  currentRoles: string[]
  suggestedRole: string
  trainingEffort: 'quick' | 'moderate' | 'complex'
  expectedBenefit: string
}

/**
 * Generate comprehensive recommendations based on job validation results
 */
export async function generateJobRecommendations(
  request: JobValidationRequest,
  workerStatus: WorkerAvailabilityStatus,
  validationErrors: any[]
): Promise<JobRecommendation[]> {
  const recommendations: JobRecommendation[] = []
  const supabase = createClient()

  try {
    // 1. Time-based recommendations
    if (request.startTime && request.endTime) {
      const timeRecommendations = await generateTimeRecommendations(request, workerStatus, supabase)
      recommendations.push(...timeRecommendations)
    }

    // 2. Worker availability recommendations
    const workerRecommendations = await generateWorkerRecommendations(request, workerStatus, supabase)
    recommendations.push(...workerRecommendations)

    // 3. Hiring recommendations
    const hiringRecommendations = await generateHiringRecommendations(request, workerStatus, supabase)
    recommendations.push(...hiringRecommendations)

    // 4. Training recommendations
    const trainingRecommendations = await generateTrainingRecommendations(request, supabase)
    recommendations.push(...trainingRecommendations)

    // 5. Job optimization recommendations
    const optimizationRecommendations = generateOptimizationRecommendations(request, workerStatus)
    recommendations.push(...optimizationRecommendations)

    // 6. Business setup recommendations
    const setupRecommendations = await generateSetupRecommendations(request, validationErrors, supabase)
    recommendations.push(...setupRecommendations)

    // Sort by impact and effort
    return recommendations.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 }
      const effortOrder = { quick: 3, moderate: 2, complex: 1 }
      
      const aScore = impactOrder[a.impact] * effortOrder[a.effort]
      const bScore = impactOrder[b.impact] * effortOrder[b.effort]
      
      return bScore - aScore
    })

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return [{
      type: 'alternative_time',
      title: 'Try a Different Approach',
      description: 'Consider adjusting your job requirements or timing to improve worker availability.',
      impact: 'medium',
      effort: 'quick',
      action: {
        type: 'modal',
        label: 'Adjust Requirements',
        action: 'adjust_job_requirements',
        priority: 'medium'
      }
    }]
  }
}

/**
 * Generate time-based recommendations (alternative slots, optimal timing)
 */
async function generateTimeRecommendations(
  request: JobValidationRequest,
  workerStatus: WorkerAvailabilityStatus,
  supabase: any
): Promise<JobRecommendation[]> {
  const recommendations: JobRecommendation[] = []

  if (workerStatus.rolesCovered === 0 || workerStatus.totalWorkersAvailable < workerStatus.totalWorkersNeeded) {
    // Find better time slots
    const alternativeSlots = await findAlternativeTimeSlots(request, supabase)
    
    if (alternativeSlots.length > 0) {
      const bestSlot = alternativeSlots[0]
      recommendations.push({
        type: 'alternative_time',
        title: 'Better Time Available',
        description: `${bestSlot.reason} - ${bestSlot.availableWorkers} workers available`,
        impact: 'high',
        effort: 'quick',
        action: {
          type: 'modal',
          label: 'Schedule for ' + bestSlot.start.toLocaleDateString(),
          action: 'reschedule_job',
          data: { 
            newStart: bestSlot.start,
            newEnd: bestSlot.end,
            availableWorkers: bestSlot.availableWorkers
          },
          priority: 'high'
        },
        data: { alternativeSlots }
      })
    }

    // Suggest optimal days of the week
    const optimalDays = await findOptimalDaysOfWeek(request, supabase)
    if (optimalDays.length > 0) {
      recommendations.push({
        type: 'alternative_time',
        title: 'Optimal Scheduling Days',
        description: `Your team typically has better availability on ${optimalDays.join(', ')}`,
        impact: 'medium',
        effort: 'quick',
        action: {
          type: 'modal',
          label: 'View Weekly Availability',
          action: 'show_weekly_availability',
          data: { optimalDays },
          priority: 'medium'
        }
      })
    }
  }

  return recommendations
}

/**
 * Generate worker-specific recommendations
 */
async function generateWorkerRecommendations(
  request: JobValidationRequest,
  workerStatus: WorkerAvailabilityStatus,
  supabase: any
): Promise<JobRecommendation[]> {
  const recommendations: JobRecommendation[] = []

  // Recommend using partially available workers
  if (workerStatus.partiallyAvailableWorkers.length > 0 && workerStatus.fullyAvailableWorkers.length < workerStatus.totalWorkersNeeded) {
    recommendations.push({
      type: 'adjust_requirements',
      title: 'Use Partially Available Workers',
      description: `${workerStatus.partiallyAvailableWorkers.length} workers have minor conflicts but could work`,
      impact: 'medium',
      effort: 'moderate',
      action: {
        type: 'modal',
        label: 'Review Partial Availability',
        action: 'show_partial_workers',
        data: { workers: workerStatus.partiallyAvailableWorkers },
        priority: 'medium'
      }
    })
  }

  // Recommend crew formations
  const crewRecommendations = await generateCrewRecommendations(request, supabase)
  recommendations.push(...crewRecommendations)

  return recommendations
}

/**
 * Generate hiring recommendations
 */
async function generateHiringRecommendations(
  request: JobValidationRequest,
  workerStatus: WorkerAvailabilityStatus,
  supabase: any
): Promise<JobRecommendation[]> {
  const recommendations: JobRecommendation[] = []

  // Analyze which roles need more workers
  const roleAnalysis = await analyzeRoleDeficits(request, supabase)
  
  for (const deficit of roleAnalysis) {
    if (deficit.currentWorkers === 0) {
      // Critical hiring need
      recommendations.push({
        type: 'hire_worker',
        title: `Hire ${deficit.roleName} Workers`,
        description: `You have no workers for ${deficit.roleName} roles. This is blocking job assignments.`,
        impact: 'high',
        effort: 'complex',
        action: {
          type: 'navigate',
          label: 'Post Job Opening',
          url: '/dashboard/team?action=hire&role=' + deficit.roleId,
          priority: 'high'
        },
        data: {
          roleId: deficit.roleId,
          roleName: deficit.roleName,
          urgency: 'high',
          suggestedCount: Math.max(2, deficit.demandPerWeek)
        }
      })
    } else if (deficit.utilizationRate > 0.8) {
      // High utilization, suggest hiring more
      recommendations.push({
        type: 'hire_worker',
        title: `Expand ${deficit.roleName} Team`,
        description: `Your ${deficit.roleName} workers are at ${Math.round(deficit.utilizationRate * 100)}% capacity`,
        impact: 'medium',
        effort: 'complex',
        action: {
          type: 'navigate',
          label: 'Hire Additional Workers',
          url: '/dashboard/team?action=hire&role=' + deficit.roleId,
          priority: 'medium'
        },
        data: {
          roleId: deficit.roleId,
          roleName: deficit.roleName,
          urgency: 'medium',
          suggestedCount: Math.ceil(deficit.demandPerWeek * 0.3)
        }
      })
    }
  }

  return recommendations
}

/**
 * Generate training recommendations
 */
async function generateTrainingRecommendations(
  request: JobValidationRequest,
  supabase: any
): Promise<JobRecommendation[]> {
  const recommendations: JobRecommendation[] = []

  // Find workers who could be trained for needed roles
  const trainingOpportunities = await findTrainingOpportunities(request, supabase)
  
  for (const opportunity of trainingOpportunities) {
    recommendations.push({
      type: 'train_worker',
      title: `Train ${opportunity.workerName} for ${opportunity.suggestedRole}`,
      description: `${opportunity.workerName} could learn ${opportunity.suggestedRole} skills to help with this type of job`,
      impact: opportunity.trainingEffort === 'quick' ? 'high' : 'medium',
      effort: opportunity.trainingEffort,
      action: {
        type: 'navigate',
        label: 'Set Up Training',
        url: `/dashboard/workers/${opportunity.workerId}?action=train&role=${opportunity.suggestedRole}`,
        priority: opportunity.trainingEffort === 'quick' ? 'high' : 'medium'
      },
      data: opportunity
    })
  }

  return recommendations
}

/**
 * Generate job optimization recommendations
 */
function generateOptimizationRecommendations(
  request: JobValidationRequest,
  workerStatus: WorkerAvailabilityStatus
): JobRecommendation[] {
  const recommendations: JobRecommendation[] = []

  // Suggest job splitting for large jobs
  if (request.estimatedHours > 8 && workerStatus.totalWorkersAvailable > 0) {
    const daysNeeded = Math.ceil(request.estimatedHours / (8 * workerStatus.totalWorkersAvailable))
    
    if (daysNeeded > 1) {
      recommendations.push({
        type: 'split_job',
        title: 'Split Into Multiple Days',
        description: `This ${request.estimatedHours}h job could be split across ${daysNeeded} days`,
        impact: 'medium',
        effort: 'moderate',
        action: {
          type: 'modal',
          label: 'Create Multi-Day Schedule',
          action: 'split_job_multi_day',
          data: { suggestedDays: daysNeeded, hoursPerDay: 8 },
          priority: 'medium'
        }
      })
    }
  }

  // Suggest combining with nearby jobs
  recommendations.push({
    type: 'adjust_requirements',
    title: 'Combine with Nearby Jobs',
    description: 'Look for other jobs in the same area to maximize efficiency',
    impact: 'medium',
    effort: 'moderate',
    action: {
      type: 'modal',
      label: 'Find Nearby Jobs',
      action: 'find_nearby_jobs',
      data: { address: request.address },
      priority: 'low'
    }
  })

  return recommendations
}

/**
 * Generate business setup recommendations
 */
async function generateSetupRecommendations(
  request: JobValidationRequest,
  validationErrors: any[],
  supabase: any
): Promise<JobRecommendation[]> {
  const recommendations: JobRecommendation[] = []

  // Check if team needs basic setup
  const hasNoRolesError = validationErrors.some(e => e.code === 'NO_JOB_ROLES')
  const hasNoWorkersError = validationErrors.some(e => e.code === 'NO_WORKERS')

  if (hasNoRolesError) {
    recommendations.push({
      type: 'adjust_requirements',
      title: 'Set Up Job Roles',
      description: 'Configure the types of work your team can perform',
      impact: 'high',
      effort: 'quick',
      action: {
        type: 'navigate',
        label: 'Add Job Roles',
        url: '/dashboard/roles',
        priority: 'high'
      }
    })
  }

  if (hasNoWorkersError) {
    recommendations.push({
      type: 'hire_worker',
      title: 'Invite Your First Workers',
      description: 'Add team members who will perform the work',
      impact: 'high',
      effort: 'quick',
      action: {
        type: 'navigate',
        label: 'Invite Workers',
        url: '/dashboard/team',
        priority: 'high'
      }
    })
  }

  // Suggest setting up worker schedules if none exist
  const { data: workersWithoutSchedules } = await supabase
    .from('workers')
    .select('id, name, default_schedule, user:users!inner(team_id)')
    .eq('user.team_id', request.teamId)
    .eq('is_active', true)

  const workersNeedingSchedules = workersWithoutSchedules?.filter(w => 
    !w.default_schedule || Object.keys(w.default_schedule).length === 0
  ) || []

  if (workersNeedingSchedules.length > 0) {
    recommendations.push({
      type: 'adjust_requirements',
      title: 'Set Up Worker Schedules',
      description: `${workersNeedingSchedules.length} workers don't have schedules configured`,
      impact: 'medium',
      effort: 'moderate',
      action: {
        type: 'navigate',
        label: 'Configure Schedules',
        url: '/dashboard/workers',
        priority: 'medium'
      },
      data: { workersNeedingSchedules }
    })
  }

  return recommendations
}

/**
 * Find alternative time slots when workers are more available
 */
async function findAlternativeTimeSlots(
  request: JobValidationRequest,
  supabase: any
): Promise<AlternativeTimeSlot[]> {
  const alternatives: AlternativeTimeSlot[] = []
  const duration = request.endTime!.getTime() - request.startTime!.getTime()

  // Check next 14 days
  for (let days = 1; days <= 14; days++) {
    const newStart = new Date(request.startTime!)
    newStart.setDate(newStart.getDate() + days)
    const newEnd = new Date(newStart.getTime() + duration)

    // Skip weekends for business jobs (could be configurable)
    if (newStart.getDay() === 0 || newStart.getDay() === 6) continue

    let totalAvailable = 0
    let totalConflicts: string[] = []

    // Check availability for each role
    for (const requirement of request.roleRequirements) {
      const availableWorkers = await findAvailableWorkers(
        requirement.job_role_id,
        { start: newStart, end: newEnd },
        request.teamId
      )

      const fullyAvailable = availableWorkers.filter(w => w.score >= 70 && w.conflicts.length === 0)
      totalAvailable += Math.min(fullyAvailable.length, requirement.quantity_required)
      
      availableWorkers.forEach(w => totalConflicts.push(...w.conflicts))
    }

    if (totalAvailable >= request.roleRequirements.reduce((sum, req) => sum + req.quantity_required, 0)) {
      alternatives.push({
        start: newStart,
        end: newEnd,
        availableWorkers: totalAvailable,
        score: 100 - (days * 5), // Prefer sooner dates
        conflicts: [...new Set(totalConflicts)],
        reason: getDayReason(newStart)
      })
    }
  }

  return alternatives.sort((a, b) => b.score - a.score).slice(0, 5)
}

/**
 * Find which days of the week typically have better availability
 */
async function findOptimalDaysOfWeek(
  request: JobValidationRequest,
  supabase: any
): Promise<string[]> {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayScores: { [key: number]: number } = {}

  // Sample availability for each day of the week
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) { // Mon-Fri
    const sampleDate = getNextWeekday(dayOfWeek)
    const timeSlot = {
      start: new Date(sampleDate.getFullYear(), sampleDate.getMonth(), sampleDate.getDate(), 9, 0),
      end: new Date(sampleDate.getFullYear(), sampleDate.getMonth(), sampleDate.getDate(), 17, 0)
    }

    let totalAvailable = 0
    for (const requirement of request.roleRequirements) {
      const availableWorkers = await findAvailableWorkers(
        requirement.job_role_id,
        timeSlot,
        request.teamId
      )
      totalAvailable += availableWorkers.filter(w => w.score >= 70).length
    }

    dayScores[dayOfWeek] = totalAvailable
  }

  // Return top 2 days
  const sortedDays = Object.entries(dayScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 2)
    .map(([day]) => dayNames[parseInt(day)])

  return sortedDays
}

/**
 * Analyze role deficits and hiring needs
 */
async function analyzeRoleDeficits(request: JobValidationRequest, supabase: any) {
  const analysis = []

  for (const requirement of request.roleRequirements) {
    // Get role info
    const { data: role } = await supabase
      .from('job_roles')
      .select('name')
      .eq('id', requirement.job_role_id)
      .single()

    // Get current workers with this role
    const { data: assignments } = await supabase
      .from('worker_capabilities')
      .select('worker_id, worker:users!inner(team_id)')
      .eq('job_role_id', requirement.job_role_id)
      .eq('is_active', true)
      .eq('worker.team_id', request.teamId)

    // Estimate demand (simplified calculation)
    const demandPerWeek = requirement.quantity_required * 2 // Assume 2 jobs per week

    analysis.push({
      roleId: requirement.job_role_id,
      roleName: role?.name || 'Unknown Role',
      currentWorkers: assignments?.length || 0,
      demandPerWeek,
      utilizationRate: Math.min(1, demandPerWeek / Math.max(1, assignments?.length || 0))
    })
  }

  return analysis
}

/**
 * Find training opportunities for existing workers
 */
async function findTrainingOpportunities(request: JobValidationRequest, supabase: any): Promise<TrainingRecommendation[]> {
  const opportunities: TrainingRecommendation[] = []

  // Get all workers and their current roles
  const { data: workers } = await supabase
    .from('workers')
    .select(`
      id,
      name,
      user:users!inner(team_id),
      worker_capabilities(job_role_id, job_role:job_roles(name), is_active)
    `)
    .eq('user.team_id', request.teamId)
    .eq('is_active', true)

  if (!workers) return opportunities

  for (const requirement of request.roleRequirements) {
    // Get role name
    const { data: role } = await supabase
      .from('job_roles')
      .select('name, required_certifications')
      .eq('id', requirement.job_role_id)
      .single()

    if (!role) continue

    // Find workers who don't have this role but could learn it
    const eligibleWorkers = workers.filter(worker => {
      const hasRole = worker.worker_capabilities?.some((capability: any) => 
        capability.job_role_id === requirement.job_role_id && capability.is_active
      )
      return !hasRole && worker.worker_capabilities?.length > 0 // Has other roles
    })

    for (const worker of eligibleWorkers.slice(0, 2)) { // Limit suggestions
      const currentRoles = worker.worker_capabilities?.filter((c: any) => c.is_active).map((c: any) => c.job_role.name) || []
      
      opportunities.push({
        workerId: worker.id,
        workerName: worker.name,
        currentRoles,
        suggestedRole: role.name,
        trainingEffort: role.required_certifications?.length > 0 ? 'moderate' : 'quick',
        expectedBenefit: `Increase team flexibility for ${role.name} jobs`
      })
    }
  }

  return opportunities.slice(0, 3) // Limit total suggestions
}

/**
 * Generate crew formation recommendations
 */
async function generateCrewRecommendations(request: JobValidationRequest, supabase: any): Promise<JobRecommendation[]> {
  const recommendations: JobRecommendation[] = []
  
  const totalWorkersNeeded = request.roleRequirements.reduce((sum, req) => sum + req.quantity_required, 0)
  
  if (totalWorkersNeeded >= 2) {
    // Check if crews exist that could handle this job
    const { data: crews } = await supabase
      .from('crews')
      .select(`
        id,
        name,
        crew_role_capabilities(job_role_id, capacity),
        crew_workers(worker_id)
      `)
      .eq('is_active', true)

    const suitableCrews = crews?.filter(crew => {
      const capabilities = crew.crew_role_capabilities || []
      return request.roleRequirements.every(req => 
        capabilities.some((cap: any) => 
          cap.job_role_id === req.job_role_id && cap.capacity >= req.quantity_required
        )
      )
    }) || []

    if (suitableCrews.length > 0) {
      recommendations.push({
        type: 'use_crew',
        title: 'Use Existing Crew',
        description: `${suitableCrews[0].name} can handle all required roles for this job`,
        impact: 'high',
        effort: 'quick',
        action: {
          type: 'modal',
          label: 'Assign Crew',
          action: 'assign_crew',
          data: { crew: suitableCrews[0] },
          priority: 'high'
        },
        data: { availableCrews: suitableCrews }
      })
    } else {
      recommendations.push({
        type: 'use_crew',
        title: 'Create New Crew',
        description: 'Form a crew with the right skills for jobs like this',
        impact: 'medium',
        effort: 'moderate',
        action: {
          type: 'navigate',
          label: 'Create Crew',
          url: '/dashboard/crews/new?suggested_roles=' + request.roleRequirements.map(r => r.job_role_id).join(','),
          priority: 'medium'
        }
      })
    }
  }

  return recommendations
}

/**
 * Helper functions
 */
function getDayReason(date: Date): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${dayNames[date.getDay()]} typically has good availability`
}

function getNextWeekday(dayOfWeek: number): Date {
  const date = new Date()
  const diff = (dayOfWeek + 7 - date.getDay()) % 7
  date.setDate(date.getDate() + (diff === 0 ? 7 : diff))
  return date
}