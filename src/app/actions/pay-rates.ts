'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PayRateUpdateData } from '@/types/database'

export interface PayRateActionResult {
  success: boolean
  error?: string
  data?: any
}

export async function getUserPayRate(userId: string): Promise<PayRateActionResult> {
  try {
    const supabase = await createClient()
    
    // Get current user's team for authorization
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get the target user's pay rate info
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('id, name, hourly_rate, team_id')
      .eq('id', userId)
      .single()

    if (error || !targetUser) {
      return { success: false, error: 'Worker not found' }
    }

    // Check authorization - only same team members can view
    if (targetUser.team_id !== userProfile.team_id) {
      return { success: false, error: 'Access denied' }
    }

    // Workers can only view their own pay rate, admins/sales can view anyone's
    if (userProfile.role === 'worker' && user.id !== userId) {
      return { success: false, error: 'You can only view your own pay rate' }
    }

    return { success: true, data: targetUser }
  } catch (error: any) {
    console.error('Error getting user pay rate:', error)
    return { success: false, error: error.message || 'Failed to get pay rate' }
  }
}

export async function updatePayRate(
  userId: string, 
  payRateData: PayRateUpdateData
): Promise<PayRateActionResult> {
  try {
    const supabase = await createClient()
    
    // Get current user for authorization
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { success: false, error: 'User profile not found' }
    }

    // Only admins can update pay rates
    if (userProfile.role !== 'admin') {
      return { success: false, error: 'Only administrators can update pay rates' }
    }

    // Validate pay rate data
    if (!payRateData.hourly_rate || payRateData.hourly_rate <= 0) {
      return { success: false, error: 'Hourly rate must be greater than 0' }
    }

    // Get the current user to check team membership
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('team_id, hourly_rate')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return { success: false, error: 'Worker not found' }
    }

    // Check same team
    if (targetUser.team_id !== userProfile.team_id) {
      return { success: false, error: 'Access denied' }
    }

    // Update the user's pay rate
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ hourly_rate: payRateData.hourly_rate })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating pay rate:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/workers')
    revalidatePath(`/dashboard/workers/${userId}`)
    
    return { success: true, data: updatedUser }
  } catch (error: any) {
    console.error('Error updating pay rate:', error)
    return { success: false, error: error.message || 'Failed to update pay rate' }
  }
}

export async function getPayRateHistory(userId: string): Promise<PayRateActionResult> {
  // Pay rate history is not currently implemented
  return { success: true, data: [] }
}

export async function validateWorkerPayRates(teamId: string): Promise<PayRateActionResult> {
  try {
    const supabase = await createClient()
    
    // Get workers with invalid pay rates
    const { data: workersWithIssues, error } = await supabase
      .from('users')
      .select('id, name, email, hourly_rate')
      .eq('team_id', teamId)
      .eq('role', 'worker')
      .eq('is_active', true)
      .or('hourly_rate.is.null,hourly_rate.lte.0')

    if (error) {
      console.error('Error validating worker pay rates:', error)
      return { success: false, error: error.message }
    }

    const issues = workersWithIssues?.filter(worker => 
      !worker.hourly_rate || worker.hourly_rate <= 0
    ) || []

    return { 
      success: true, 
      data: {
        valid: issues.length === 0,
        workers_with_issues: issues,
        total_workers: workersWithIssues?.length || 0,
        issues_count: issues.length
      }
    }
  } catch (error: any) {
    console.error('Error validating worker pay rates:', error)
    return { success: false, error: error.message || 'Failed to validate pay rates' }
  }
}

export async function calculateJobPayCost(
  jobId: string,
  payableHours: number
): Promise<PayRateActionResult> {
  try {
    const supabase = await createClient()
    
    // Get job with assigned workers and their pay rates
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        job_role_requirements(
          quantity_required,
          job_role:job_roles(
            name,
            worker_role_assignments(
              worker_id,
              worker:users(
                id, name, hourly_rate
              )
            )
          )
        )
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return { success: false, error: 'Job not found' }
    }

    let totalCost = 0
    const workerCosts: Array<{
      worker_id: string
      worker_name: string
      hourly_rate: number
      hours: number
      cost: number
    }> = []

    // Calculate cost for each assigned worker
    if (job.job_role_requirements) {
      for (const requirement of job.job_role_requirements) {
        if (requirement.job_role?.worker_role_assignments) {
          for (const assignment of requirement.job_role.worker_role_assignments) {
            const worker = assignment.worker
            if (worker) {
              const workerCost = worker.hourly_rate * payableHours
              totalCost += workerCost
              
              workerCosts.push({
                worker_id: worker.id,
                worker_name: worker.name,
                hourly_rate: worker.hourly_rate,
                hours: payableHours,
                cost: workerCost
              })
            }
          }
        }
      }
    }

    return {
      success: true,
      data: {
        total_cost: totalCost,
        worker_costs: workerCosts,
        payable_hours: payableHours
      }
    }
  } catch (error: any) {
    console.error('Error calculating job pay cost:', error)
    return { success: false, error: error.message || 'Failed to calculate job cost' }
  }
}