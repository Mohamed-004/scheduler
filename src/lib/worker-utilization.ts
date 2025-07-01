/**
 * Worker Utilization Tracking System
 * Calculates worker weekly hours, utilization, and fairness metrics
 */

import { createClient } from '@/lib/supabase/client'

export interface WorkerUtilization {
  worker_id: string
  worker_name: string
  current_week_hours: number
  target_weekly_hours: number
  utilization_percentage: number
  jobs_this_week: number
  fairness_score: number // Higher score = more deserving of work (lower utilization)
  is_available: boolean
}

export interface UtilizationSummary {
  total_workers: number
  average_utilization: number
  most_utilized: WorkerUtilization | null
  least_utilized: WorkerUtilization | null
  balanced_count: number // Workers within 10% of target
}

/**
 * Gets the current week's start and end dates (Monday to Sunday)
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Days to subtract to get Monday
  
  const start = new Date(now)
  start.setDate(now.getDate() - daysToMonday)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

/**
 * Calculates utilization for all workers in a team
 */
export async function calculateTeamUtilization(teamId: string): Promise<WorkerUtilization[]> {
  const supabase = createClient()
  const { start, end } = getCurrentWeekRange()

  try {
    // Get all workers in the team  
    const { data: teamUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('team_id', teamId)
      .eq('role', 'worker')

    if (usersError) throw usersError
    if (!teamUsers || teamUsers.length === 0) return []

    const workerIds = teamUsers.map(u => u.id)

    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name, weekly_hours, is_active, user_id')
      .in('user_id', workerIds)
      .eq('is_active', true)

    if (workersError) throw workersError

    if (!workers || workers.length === 0) {
      return []
    }

    const utilizations: WorkerUtilization[] = []

    for (const worker of workers) {
      // Get this week's scheduled hours from job assignments
      // worker_role_assignments uses user_id, not the worker's internal ID
      const { data: assignments, error: assignmentsError } = await supabase
        .from('worker_role_assignments')
        .select('job_id, hourly_rate')
        .eq('worker_id', worker.user_id)

      let currentWeekHours = 0
      let jobsThisWeek = 0

      if (assignments && assignments.length > 0) {
        // Get job details for assignments this week
        const jobIds = assignments.map(a => a.job_id).filter(Boolean)
        if (jobIds.length > 0) {
          const { data: jobs } = await supabase
            .from('jobs')
            .select('id, start_time, end_time, estimated_hours')
            .in('id', jobIds)
            .gte('start_time', start.toISOString())
            .lte('start_time', end.toISOString())

          if (jobs) {
            jobsThisWeek = jobs.length
            for (const job of jobs) {
              if (job.estimated_hours) {
                currentWeekHours += job.estimated_hours
              } else if (job.start_time && job.end_time) {
                const jobStart = new Date(job.start_time)
                const jobEnd = new Date(job.end_time)
                const hours = (jobEnd.getTime() - jobStart.getTime()) / (1000 * 60 * 60)
                currentWeekHours += hours
              }
            }
          }
        }
      }

      if (assignmentsError) {
        console.warn(`Error fetching assignments for worker ${worker.id}:`, assignmentsError)
        // Continue with zero hours if there's an error
      }

      const targetWeeklyHours = worker.weekly_hours || 40
      const utilizationPercentage = Math.min((currentWeekHours / targetWeeklyHours) * 100, 100)
      
      // Fairness score: inverse of utilization (0-100, higher = more deserving)
      // Workers with 0% utilization get 100 fairness, 100% utilization gets 0 fairness
      const fairnessScore = Math.max(0, 100 - utilizationPercentage)

      utilizations.push({
        worker_id: worker.user_id,
        worker_name: worker.name,
        current_week_hours: currentWeekHours,
        target_weekly_hours: targetWeeklyHours,
        utilization_percentage: utilizationPercentage,
        jobs_this_week: jobsThisWeek,
        fairness_score: fairnessScore,
        is_available: worker.is_active
      })
    }

    return utilizations.sort((a, b) => a.utilization_percentage - b.utilization_percentage)
  } catch (error) {
    console.error('Error calculating team utilization:', error)
    return []
  }
}

/**
 * Gets utilization summary for a team
 */
export async function getUtilizationSummary(teamId: string): Promise<UtilizationSummary> {
  const utilizations = await calculateTeamUtilization(teamId)

  if (utilizations.length === 0) {
    return {
      total_workers: 0,
      average_utilization: 0,
      most_utilized: null,
      least_utilized: null,
      balanced_count: 0
    }
  }

  const totalUtilization = utilizations.reduce((sum, u) => sum + u.utilization_percentage, 0)
  const averageUtilization = totalUtilization / utilizations.length

  const mostUtilized = utilizations[utilizations.length - 1] // Highest utilization
  const leastUtilized = utilizations[0] // Lowest utilization

  // Count workers within 10% of target (90-110% utilization)
  const balancedCount = utilizations.filter(u => 
    u.utilization_percentage >= 90 && u.utilization_percentage <= 110
  ).length

  return {
    total_workers: utilizations.length,
    average_utilization: averageUtilization,
    most_utilized: mostUtilized,
    least_utilized: leastUtilized,
    balanced_count: balancedCount
  }
}

/**
 * Gets utilization for a specific worker
 */
export async function getWorkerUtilization(workerId: string): Promise<WorkerUtilization | null> {
  const supabase = createClient()

  try {
    console.log('🔍 WORKER UTILIZATION - getWorkerUtilization called with:', workerId)
    
    // workerId might be either a worker ID or user ID, so we need to check both
    // First try to find the worker record by ID
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('user_id, user:users(team_id)')
      .eq('id', workerId)
      .single()

    console.log('🔍 WORKER UTILIZATION - First query result:', {
      workerId,
      worker,
      workerError: workerError ? {
        message: workerError.message,
        code: workerError.code,
        details: workerError.details,
        hint: workerError.hint
      } : null
    })

    let teamId: string
    let actualUserId: string

    if (worker && !workerError) {
      // Found by worker ID
      teamId = worker.user.team_id
      actualUserId = worker.user_id
    } else {
      // Try to find by user ID
      console.log('🔍 WORKER UTILIZATION - Trying second query with user ID:', workerId)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', workerId)
        .single()

      console.log('🔍 WORKER UTILIZATION - Second query result:', {
        workerId,
        user,
        userError: userError ? {
          message: userError.message,
          code: userError.code,
          details: userError.details,
          hint: userError.hint
        } : null
      })

      if (userError || !user) {
        console.log('❌ WORKER UTILIZATION - Both queries failed, returning null')
        return null
      }
      teamId = user.team_id
      actualUserId = workerId
    }

    const utilizations = await calculateTeamUtilization(teamId)
    return utilizations.find(u => u.worker_id === actualUserId) || null
  } catch (error) {
    console.error('Error getting worker utilization:', error)
    return null
  }
}

/**
 * Gets fairness-boosted score for worker selection
 * Combines base score with fairness bonus to promote equitable work distribution
 */
export function calculateFairnessScore(
  baseScore: number,
  utilizationPercentage: number,
  fairnessWeight: number = 0.3
): number {
  // Fairness bonus: inverse of utilization
  const fairnessBonus = Math.max(0, 100 - utilizationPercentage)
  
  // Combine base score with fairness bonus
  const weightedScore = (baseScore * (1 - fairnessWeight)) + (fairnessBonus * fairnessWeight)
  
  return Math.min(100, Math.max(0, weightedScore))
}

/**
 * Gets formatted utilization display string
 */
export function formatUtilization(utilization: WorkerUtilization): string {
  const { current_week_hours, target_weekly_hours, utilization_percentage } = utilization
  return `${current_week_hours.toFixed(1)}h / ${target_weekly_hours}h (${utilization_percentage.toFixed(0)}%)`
}

/**
 * Gets utilization status color and label
 */
export function getUtilizationStatus(percentage: number): {
  status: 'low' | 'balanced' | 'high' | 'overloaded'
  color: string
  label: string
} {
  if (percentage < 70) {
    return { status: 'low', color: 'text-blue-600 bg-blue-100', label: 'Available' }
  } else if (percentage < 90) {
    return { status: 'balanced', color: 'text-green-600 bg-green-100', label: 'Balanced' }
  } else if (percentage < 110) {
    return { status: 'high', color: 'text-yellow-600 bg-yellow-100', label: 'Busy' }
  } else {
    return { status: 'overloaded', color: 'text-red-600 bg-red-100', label: 'Overloaded' }
  }
}