'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface JobRole {
  id: string
  team_id: string
  name: string
  description?: string
  hourly_rate_base?: number
  hourly_rate_multiplier: number
  required_certifications: string[]
  physical_demands?: string
  equipment_required: string[]
  color_code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateJobRoleData {
  name: string
  description?: string
  hourly_rate_base?: number
  hourly_rate_multiplier?: number
  required_certifications?: string[]
  physical_demands?: string
  equipment_required?: string[]
  color_code?: string
}

export async function getJobRoles() {
  try {
    const supabase = await createClient()
    
    // Get current user's team
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

    // Only admin and sales can view job roles
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Get job roles for the team
    const { data: jobRoles, error } = await supabase
      .from('job_roles')
      .select('*')
      .eq('team_id', userProfile.team_id)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching job roles:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: jobRoles as JobRole[] }
  } catch (error: any) {
    console.error('Error in getJobRoles:', error)
    return { success: false, error: error.message }
  }
}

export async function createJobRole(data: CreateJobRoleData) {
  try {
    const supabase = await createClient()
    
    // Get current user's team
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

    // Only admin and sales can create job roles
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Create the job role
    const { data: newRole, error } = await supabase
      .from('job_roles')
      .insert([{
        team_id: userProfile.team_id,
        name: data.name,
        description: data.description,
        hourly_rate_base: data.hourly_rate_base,
        hourly_rate_multiplier: data.hourly_rate_multiplier || 1.0,
        required_certifications: data.required_certifications || [],
        physical_demands: data.physical_demands,
        equipment_required: data.equipment_required || [],
        color_code: data.color_code || '#3B82F6'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating job role:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/roles')
    return { success: true, data: newRole }
  } catch (error: any) {
    console.error('Error in createJobRole:', error)
    return { success: false, error: error.message }
  }
}

export async function updateJobRole(id: string, data: Partial<CreateJobRoleData>) {
  try {
    const supabase = await createClient()
    
    // Get current user's team
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

    // Only admin and sales can update job roles
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Update the job role
    const { data: updatedRole, error } = await supabase
      .from('job_roles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('team_id', userProfile.team_id) // Ensure team ownership
      .select()
      .single()

    if (error) {
      console.error('Error updating job role:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/roles')
    return { success: true, data: updatedRole }
  } catch (error: any) {
    console.error('Error in updateJobRole:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteJobRole(id: string) {
  try {
    const supabase = await createClient()
    
    // Get current user's team
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

    // Only admin can delete job roles
    if (userProfile.role !== 'admin') {
      return { success: false, error: 'Only admins can delete job roles' }
    }

    // Check if role is being used in any jobs
    const { data: jobsUsingRole, error: checkError } = await supabase
      .from('job_role_requirements')
      .select('job_id')
      .eq('job_role_id', id)
      .limit(1)

    if (checkError) {
      console.error('Error checking job role usage:', checkError)
      return { success: false, error: checkError.message }
    }

    if (jobsUsingRole && jobsUsingRole.length > 0) {
      return { success: false, error: 'Cannot delete role that is being used in jobs. Deactivate it instead.' }
    }

    // Delete the job role
    const { error } = await supabase
      .from('job_roles')
      .delete()
      .eq('id', id)
      .eq('team_id', userProfile.team_id) // Ensure team ownership

    if (error) {
      console.error('Error deleting job role:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/roles')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteJobRole:', error)
    return { success: false, error: error.message }
  }
}

export async function toggleJobRoleStatus(id: string, isActive: boolean) {
  try {
    const result = await updateJobRole(id, { is_active: isActive })
    return result
  } catch (error: any) {
    console.error('Error in toggleJobRoleStatus:', error)
    return { success: false, error: error.message }
  }
}

export async function getJobRoleStats(roleId: string) {
  try {
    const supabase = await createClient()
    
    // Get current user's team
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get qualified workers count
    const { data: qualifiedWorkers, error: workersError } = await supabase
      .rpc('find_available_workers_for_role', {
        p_job_role_id: roleId,
        p_team_id: userProfile.team_id,
        p_start_date: new Date().toISOString().split('T')[0]
      })

    // Get jobs using this role
    const { data: jobsUsingRole, error: jobsError } = await supabase
      .from('job_role_requirements')
      .select('job_id, jobs(job_type, status)')
      .eq('job_role_id', roleId)

    if (workersError || jobsError) {
      console.error('Error getting role stats:', workersError || jobsError)
      return { success: false, error: (workersError || jobsError)?.message }
    }

    const stats = {
      qualified_workers: qualifiedWorkers?.available_workers?.length || 0,
      active_jobs: jobsUsingRole?.filter(j => j.jobs?.status !== 'COMPLETED').length || 0,
      total_jobs: jobsUsingRole?.length || 0
    }

    return { success: true, data: stats }
  } catch (error: any) {
    console.error('Error in getJobRoleStats:', error)
    return { success: false, error: error.message }
  }
}