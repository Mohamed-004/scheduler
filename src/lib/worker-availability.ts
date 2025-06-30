import { createClient } from '@/lib/supabase/client'
import { getDayName, isWorkerAvailableOnDay, getWorkingHours, calculateDayNetHours } from '@/lib/schedule-utils'
import type { WeeklySchedule, ScheduleException } from '@/lib/validations/worker-schedule'

export interface Worker {
  id: string
  name: string
  rating: number
  user_id: string
  default_schedule: WeeklySchedule
  schedule_exceptions: ScheduleException[]
}

export interface JobRole {
  id: string
  name: string
  description?: string
  required_certifications: string[]
  color_code: string
  hourly_rate_base?: number
}

export interface WorkerAssignment {
  id: string
  job_role_id: string
  worker_id: string
  hourly_rate?: number
  is_lead: boolean
}

export interface AvailabilityScore {
  worker_id: string
  worker_name: string
  score: number
  reasons: string[]
  conflicts: string[]
  available_hours: number
  qualification_score: number
  suggested_rate: number
}

export interface TimeSlot {
  start: Date
  end: Date
}

export interface JobRequirement {
  job_role_id: string
  quantity_required: number
  min_proficiency_level?: number
}

/**
 * Check if a worker is available during a specific time slot
 */
export async function checkWorkerAvailability(
  workerId: string,
  timeSlot: TimeSlot
): Promise<{
  available: boolean
  conflicts: string[]
  available_hours: number
}> {
  const supabase = createClient()
  
  try {
    // Get worker's schedule
    const { data: worker } = await supabase
      .from('workers')
      .select('default_schedule, schedule_exceptions')
      .eq('id', workerId)
      .single()

    if (!worker) {
      return { available: false, conflicts: ['Worker not found'], available_hours: 0 }
    }

    const schedule = worker.default_schedule as WeeklySchedule
    const exceptions = worker.schedule_exceptions as ScheduleException[]
    const conflicts: string[] = []

    // Check each day in the time slot
    const startDate = new Date(timeSlot.start.getFullYear(), timeSlot.start.getMonth(), timeSlot.start.getDate())
    const endDate = new Date(timeSlot.end.getFullYear(), timeSlot.end.getMonth(), timeSlot.end.getDate())
    
    let totalAvailableHours = 0
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayName = getDayName(currentDate)
      const dayDateStr = currentDate.toISOString().split('T')[0]

      // Check for schedule exceptions first
      const exception = exceptions.find(exc => 
        exc.date === dayDateStr || 
        (exc.startDate && exc.endDate && dayDateStr >= exc.startDate && dayDateStr <= exc.endDate)
      )

      if (exception) {
        if (exception.type === 'vacation' || exception.type === 'sick' || exception.type === 'personal') {
          conflicts.push(`${exception.type} on ${currentDate.toLocaleDateString()}`)
        } else if (exception.isFullDay === false && exception.startTime && exception.endTime) {
          // Partial day exception - calculate available hours
          const dayHours = calculateDayNetHours(schedule, currentDate)
          const exceptionStart = new Date(`${dayDateStr}T${exception.startTime}:00`)
          const exceptionEnd = new Date(`${dayDateStr}T${exception.endTime}:00`)
          const exceptionDuration = (exceptionEnd.getTime() - exceptionStart.getTime()) / (1000 * 60 * 60)
          totalAvailableHours += Math.max(0, dayHours - exceptionDuration)
        }
      } else {
        // Normal schedule check
        if (isWorkerAvailableOnDay(schedule, currentDate)) {
          const dayHours = calculateDayNetHours(schedule, currentDate)
          totalAvailableHours += dayHours
        } else {
          conflicts.push(`Not available on ${dayName}s`)
        }
      }

      // Check for existing job assignments
      const { data: existingJobs } = await supabase
        .from('jobs')
        .select('id, start_time, end_time, job_type')
        .or(`worker_role_assignments.worker_id.eq.${workerId}`)
        .gte('start_time', currentDate.toISOString())
        .lt('start_time', new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString())

      if (existingJobs && existingJobs.length > 0) {
        existingJobs.forEach(job => {
          conflicts.push(`Already assigned to job: ${job.job_type}`)
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return {
      available: conflicts.length === 0 && totalAvailableHours > 0,
      conflicts,
      available_hours: totalAvailableHours
    }
  } catch (error) {
    console.error('Error checking worker availability:', error)
    return { available: false, conflicts: ['Error checking availability'], available_hours: 0 }
  }
}

/**
 * Calculate worker qualification score for a specific job role
 */
export async function calculateQualificationScore(
  workerId: string,
  jobRoleId: string
): Promise<{
  score: number
  reasons: string[]
  hasRequiredCertifications: boolean
}> {
  const supabase = createClient()
  const reasons: string[] = []

  try {
    // Get job role requirements
    const { data: jobRole } = await supabase
      .from('job_roles')
      .select('*')
      .eq('id', jobRoleId)
      .single()

    if (!jobRole) {
      return { score: 0, reasons: ['Job role not found'], hasRequiredCertifications: false }
    }

    // Get worker's role assignments and qualifications
    const { data: workerAssignments } = await supabase
      .from('worker_role_assignments')
      .select('*')
      .eq('worker_id', workerId)
      .eq('job_role_id', jobRoleId)

    // Base score
    let score = 50

    // Experience with this role
    if (workerAssignments && workerAssignments.length > 0) {
      score += 20
      reasons.push(`Has experience with ${jobRole.name}`)
      
      // Lead experience bonus
      if (workerAssignments.some(a => a.is_lead)) {
        score += 10
        reasons.push('Has lead experience in this role')
      }
    }

    // Check required certifications
    let hasAllCertifications = true
    if (jobRole.required_certifications && jobRole.required_certifications.length > 0) {
      const { data: workerCertifications } = await supabase
        .from('worker_certifications')
        .select('certification_name, is_verified, expiry_date')
        .eq('worker_id', workerId)
        .in('certification_name', jobRole.required_certifications)

      const validCertifications = workerCertifications?.filter(cert => 
        cert.is_verified && 
        (!cert.expiry_date || new Date(cert.expiry_date) >= new Date())
      ) || []

      const missingCertifications = jobRole.required_certifications.filter(
        reqCert => !validCertifications.some(cert => cert.certification_name === reqCert)
      )

      if (missingCertifications.length === 0) {
        score += 20
        reasons.push('Has all required certifications')
      } else {
        hasAllCertifications = false
        score -= missingCertifications.length * 10
        reasons.push(`Missing certifications: ${missingCertifications.join(', ')}`)
      }
    }

    // Worker rating bonus
    const { data: worker } = await supabase
      .from('workers')
      .select('rating')
      .eq('id', workerId)
      .single()

    if (worker?.rating) {
      const ratingBonus = (worker.rating - 3) * 5 // 3 is neutral, gives -10 to +10
      score += ratingBonus
      if (ratingBonus > 0) {
        reasons.push(`High rating (${worker.rating}/5)`)
      } else if (ratingBonus < 0) {
        reasons.push(`Lower rating (${worker.rating}/5)`)
      }
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      reasons,
      hasRequiredCertifications: hasAllCertifications
    }
  } catch (error) {
    console.error('Error calculating qualification score:', error)
    return { score: 0, reasons: ['Error calculating score'], hasRequiredCertifications: false }
  }
}

/**
 * Find available workers for a specific job role and time slot
 */
export async function findAvailableWorkers(
  jobRoleId: string,
  timeSlot: TimeSlot,
  teamId: string,
  excludeWorkerIds: string[] = []
): Promise<AvailabilityScore[]> {
  const supabase = createClient()

  try {
    // Get all active workers in the team
    const { data: workers } = await supabase
      .from('workers')
      .select(`
        id,
        name,
        rating,
        user_id,
        default_schedule,
        schedule_exceptions,
        user:users!inner(id, team_id)
      `)
      .eq('is_active', true)
      .eq('user.team_id', teamId)
      .not('id', 'in', `(${excludeWorkerIds.join(',')})`)

    if (!workers || workers.length === 0) {
      return []
    }

    const availabilityScores: AvailabilityScore[] = []

    // Check each worker
    for (const worker of workers) {
      // Check availability
      const availability = await checkWorkerAvailability(worker.id, timeSlot)
      
      // Calculate qualification score
      const qualification = await calculateQualificationScore(worker.id, jobRoleId)

      // Get suggested rate
      const { data: roleAssignment } = await supabase
        .from('worker_role_assignments')
        .select('hourly_rate')
        .eq('worker_id', worker.id)
        .eq('job_role_id', jobRoleId)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single()

      const { data: jobRole } = await supabase
        .from('job_roles')
        .select('hourly_rate_base')
        .eq('id', jobRoleId)
        .single()

      const suggestedRate = roleAssignment?.hourly_rate || jobRole?.hourly_rate_base || 25

      // Calculate overall score
      const availabilityWeight = 0.4
      const qualificationWeight = 0.6
      
      const availabilityScore = availability.available ? 100 : Math.max(0, 100 - availability.conflicts.length * 20)
      const overallScore = (availabilityScore * availabilityWeight) + (qualification.score * qualificationWeight)

      availabilityScores.push({
        worker_id: worker.id,
        worker_name: worker.name,
        score: Math.round(overallScore),
        reasons: [...qualification.reasons, ...(availability.available ? ['Available for requested time slot'] : [])],
        conflicts: availability.conflicts,
        available_hours: availability.available_hours,
        qualification_score: qualification.score,
        suggested_rate: suggestedRate
      })
    }

    // Sort by score (highest first)
    return availabilityScores.sort((a, b) => b.score - a.score)
  } catch (error) {
    console.error('Error finding available workers:', error)
    return []
  }
}

/**
 * Get optimal crew assignment for a job
 */
export async function getOptimalCrewAssignment(
  requirements: JobRequirement[],
  timeSlot: TimeSlot,
  teamId: string
): Promise<{
  success: boolean
  assignments: Array<{
    job_role_id: string
    worker_id: string
    worker_name: string
    score: number
    suggested_rate: number
    is_lead: boolean
  }>
  unfilledRoles: JobRequirement[]
  totalScore: number
}> {
  const assignments: Array<{
    job_role_id: string
    worker_id: string
    worker_name: string
    score: number
    suggested_rate: number
    is_lead: boolean
  }> = []
  
  const unfilledRoles: JobRequirement[] = []
  const usedWorkerIds: string[] = []
  let totalScore = 0

  try {
    // Process each role requirement
    for (const requirement of requirements) {
      const availableWorkers = await findAvailableWorkers(
        requirement.job_role_id,
        timeSlot,
        teamId,
        usedWorkerIds
      )

      // Filter by minimum proficiency if specified
      const qualifiedWorkers = requirement.min_proficiency_level
        ? availableWorkers.filter(w => w.qualification_score >= (requirement.min_proficiency_level! * 20))
        : availableWorkers

      const workersNeeded = requirement.quantity_required
      const assignedWorkers = qualifiedWorkers.slice(0, workersNeeded)

      if (assignedWorkers.length < workersNeeded) {
        unfilledRoles.push({
          ...requirement,
          quantity_required: workersNeeded - assignedWorkers.length
        })
      }

      // Assign workers (first one as lead for each role)
      assignedWorkers.forEach((worker, index) => {
        assignments.push({
          job_role_id: requirement.job_role_id,
          worker_id: worker.worker_id,
          worker_name: worker.worker_name,
          score: worker.score,
          suggested_rate: worker.suggested_rate,
          is_lead: index === 0 && assignments.filter(a => a.is_lead).length === 0 // First worker of first role is overall lead
        })
        
        usedWorkerIds.push(worker.worker_id)
        totalScore += worker.score
      })
    }

    const averageScore = assignments.length > 0 ? totalScore / assignments.length : 0

    return {
      success: unfilledRoles.length === 0,
      assignments,
      unfilledRoles,
      totalScore: Math.round(averageScore)
    }
  } catch (error) {
    console.error('Error getting optimal crew assignment:', error)
    return {
      success: false,
      assignments: [],
      unfilledRoles: requirements,
      totalScore: 0
    }
  }
}