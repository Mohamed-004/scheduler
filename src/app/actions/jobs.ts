/**
 * Job Server Actions
 * Handles CRUD operations for jobs with proper validation and error handling
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { 
  validateJobData, 
  validateJobUpdate, 
  transformJobFormData,
  type JobFormData,
  type JobUpdateData 
} from '@/lib/validations/jobs'
import type { 
  CreateJobForm, 
  Job, 
  JobWithRelations, 
  JobStatus 
} from '@/types/database'
// Choose your email service:
import { sendInvitationEmail, sendRoleChangeEmail } from '@/lib/email'        // SendGrid (current)
// import { sendInvitationEmail, sendRoleChangeEmail } from '@/lib/email-gmail'  // Gmail SMTP (alternative)

/**
 * Create a new job for the team
 */
export async function createJob(formData: CreateJobForm) {
  const supabase = await createClient()

  try {
    // Get current user and their team
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'User not authenticated' }
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { error: 'Failed to get user profile' }
    }

    // Check permissions (admin and sales can create jobs)
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return { error: 'Insufficient permissions to create jobs' }
    }

    // Validate client belongs to team
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', formData.client_id)
      .eq('team_id', userProfile.team_id)
      .single()

    if (clientError || !client) {
      return { error: 'Invalid client or client does not belong to your team' }
    }

    // Validate worker belongs to team (if assigned)
    if (formData.assigned_worker_id) {
      const { data: worker, error: workerError } = await supabase
        .from('users')
        .select('id')
        .eq('id', formData.assigned_worker_id)
        .eq('team_id', userProfile.team_id)
        .eq('role', 'worker')
        .single()

      if (workerError || !worker) {
        return { error: 'Invalid worker or worker does not belong to your team' }
      }
    }

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        team_id: userProfile.team_id,
        client_id: formData.client_id,
        assigned_worker_id: formData.assigned_worker_id,
        address: formData.address,
        job_type: formData.job_type,
        estimated_hours: formData.estimated_hours,
        quote_amount: formData.quote_amount,
        equipment_required: formData.equipment_required || [],
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
        status: 'PENDING' as JobStatus,
      })
      .select()
      .single()

    if (jobError) {
      return { error: `Failed to create job: ${jobError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/jobs')

    return { success: true, job_id: job.id }
  } catch (error) {
    return { error: 'An unexpected error occurred while creating the job' }
  }
}

/**
 * Update an existing job
 */
export async function updateJob(jobId: string, formData: Partial<CreateJobForm>) {
  const supabase = await createClient()

  try {
    // Get current user and their team
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'User not authenticated' }
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { error: 'Failed to get user profile' }
    }

    // Check permissions (admin and sales can update jobs)
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return { error: 'Insufficient permissions to update jobs' }
    }

    // Verify job belongs to team
    const { data: existingJob, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('team_id', userProfile.team_id)
      .single()

    if (jobError || !existingJob) {
      return { error: 'Job not found or does not belong to your team' }
    }

    // Validate worker if being updated
    if (formData.assigned_worker_id) {
      const { data: worker, error: workerError } = await supabase
        .from('users')
        .select('id')
        .eq('id', formData.assigned_worker_id)
        .eq('team_id', userProfile.team_id)
        .eq('role', 'worker')
        .single()

      if (workerError || !worker) {
        return { error: 'Invalid worker or worker does not belong to your team' }
      }
    }

    // Update the job
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (updateError) {
      return { error: `Failed to update job: ${updateError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/jobs')
    revalidatePath(`/dashboard/jobs/${jobId}`)

    return { success: true }
  } catch (error) {
    return { error: 'An unexpected error occurred while updating the job' }
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(jobId: string, status: JobStatus) {
  const supabase = await createClient()

  try {
    // Get current user and their team
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'User not authenticated' }
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { error: 'Failed to get user profile' }
    }

    // Verify job belongs to team
    const { data: existingJob, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('team_id', userProfile.team_id)
      .single()

    if (jobError || !existingJob) {
      return { error: 'Job not found or does not belong to your team' }
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    // Set actual times based on status
    if (status === 'IN_PROGRESS' && !existingJob.actual_start) {
      updateData.actual_start = new Date().toISOString()
    }
    
    if (status === 'COMPLETED' && !existingJob.actual_end) {
      updateData.actual_end = new Date().toISOString()
    }

    // Update the job
    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)

    if (updateError) {
      return { error: `Failed to update job status: ${updateError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/jobs')
    revalidatePath(`/dashboard/jobs/${jobId}`)

    return { success: true }
  } catch (error) {
    return { error: 'An unexpected error occurred while updating job status' }
  }
}

/**
 * Delete a job
 */
export async function deleteJob(jobId: string) {
  const supabase = await createClient()

  try {
    // Get current user and their team
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'User not authenticated' }
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { error: 'Failed to get user profile' }
    }

    // Check permissions (only admin can delete jobs)
    if (userProfile.role !== 'admin') {
      return { error: 'Only administrators can delete jobs' }
    }

    // Verify job belongs to team
    const { data: existingJob, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('team_id', userProfile.team_id)
      .single()

    if (jobError || !existingJob) {
      return { error: 'Job not found or does not belong to your team' }
    }

    // Delete the job
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)

    if (deleteError) {
      return { error: `Failed to delete job: ${deleteError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/jobs')

    return { success: true }
  } catch (error) {
    return { error: 'An unexpected error occurred while deleting the job' }
  }
}

/**
 * Assign worker to job
 */
export async function assignWorkerToJob(jobId: string, workerId: string) {
  const supabase = await createClient()

  try {
    // Get current user and their team
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'User not authenticated' }
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { error: 'Failed to get user profile' }
    }

    // Check permissions
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return { error: 'Insufficient permissions to assign workers' }
    }

    // Validate worker belongs to team
    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', workerId)
      .eq('team_id', userProfile.team_id)
      .eq('role', 'worker')
      .single()

    if (workerError || !worker) {
      return { error: 'Worker not found or does not belong to your team' }
    }

    // Update job with worker assignment
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        assigned_worker_id: workerId,
        status: 'SCHEDULED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('team_id', userProfile.team_id)

    if (updateError) {
      return { error: `Failed to assign worker: ${updateError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/jobs')
    revalidatePath(`/dashboard/jobs/${jobId}`)

    return { success: true }
  } catch (error) {
    return { error: 'An unexpected error occurred while assigning worker' }
  }
}

/**
 * Get jobs for team with filtering and pagination
 */
export async function getTeamJobs(options?: {
  status?: JobStatus
  workerId?: string
  clientId?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()

  try {
    // Get current user and their team
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'User not authenticated' }
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { error: 'Failed to get user profile' }
    }

    // Build query
    let query = supabase
      .from('jobs')
      .select(`
        *,
        client:clients(*),
        assigned_worker:users(id, name, email, role),
        team:teams(*)
      `)
      .eq('team_id', userProfile.team_id)

    // Apply filters
    if (options?.status) {
      query = query.eq('status', options.status)
    }
    if (options?.workerId) {
      query = query.eq('assigned_worker_id', options.workerId)
    }
    if (options?.clientId) {
      query = query.eq('client_id', options.clientId)
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options?.limit || 50)) - 1)
    }

    // Order by created date
    query = query.order('created_at', { ascending: false })

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      return { error: `Failed to fetch jobs: ${jobsError.message}` }
    }

    return { success: true, jobs: jobs || [] }
  } catch (error) {
    return { error: 'An unexpected error occurred while fetching jobs' }
  }
}

// Get job by ID
export async function getJob(jobId: string) {
  try {
    const supabase = await createClient()
    
    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        client:clients(id, name, email, phone, address),
        crew:crews(id, name, description, is_active),
        timeline_items(
          id,
          worker_id,
          start,
          finish,
          notes,
          worker:workers(id, name, phone, rating)
        )
      `)
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('Job fetch error:', error)
      return { success: false, error: 'Job not found' }
    }

    return { success: true, job }
  } catch (error) {
    console.error('Unexpected error in getJob:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Get all jobs with filters
export async function getJobs(filters?: {
  status?: string
  client_id?: string
  crew_id?: string
  search?: string
}) {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('jobs')
      .select(`
        id,
        job_type,
        status,
        estimated_hours,
        quote_amount,
        start,
        finish,
        address,
        created_at,
        client:clients(id, name, email),
        crew:crews(id, name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id)
    }
    if (filters?.crew_id) {
      query = query.eq('crew_id', filters.crew_id)
    }

    const { data: jobs, error } = await query

    if (error) {
      console.error('Jobs fetch error:', error)
      return { success: false, error: 'Failed to fetch jobs' }
    }

    // Apply text search filter on client side if needed
    let filteredJobs = jobs || []
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredJobs = filteredJobs.filter((job: any) =>
        job.job_type.toLowerCase().includes(searchTerm) ||
        job.address.toLowerCase().includes(searchTerm) ||
        (job.client && job.client.name && job.client.name.toLowerCase().includes(searchTerm)) ||
        (job.crew && job.crew.name && job.crew.name.toLowerCase().includes(searchTerm))
      )
    }

    return { success: true, jobs: filteredJobs }
  } catch (error) {
    console.error('Unexpected error in getJobs:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Send invitation emails for successful invitations
 */
export async function sendInvitationEmails(invitations: Array<{
  email: string
  token: string
  role: string
  name?: string
  invitationType: 'new_user' | 'role_change'
}>) {
  const supabase = await createClient()
  
  try {
    // Get current user for inviter name
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    const { data: inviterProfile } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.name || inviterProfile?.email || 'Team Admin'

    const results = []
    
    console.log('🔍 Email Debug - Environment Variables:', {
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'Present' : 'Missing',
      EMAIL_FROM: process.env.EMAIL_FROM || 'Default',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'Missing'
    })

    for (const invitation of invitations) {
      try {
        const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/invite?token=${invitation.token}`
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        
        console.log(`📧 Sending email to: ${invitation.email}`)
        console.log(`🔗 Invitation URL: ${invitationUrl}`)
        
        const emailData = {
          email: invitation.email,
          name: invitation.name,
          role: invitation.role,
          inviterName,
          invitationUrl,
          expiresAt
        }

        if (invitation.invitationType === 'role_change') {
          const result = await sendRoleChangeEmail(emailData)
          console.log(`📧 Role change email result for ${invitation.email}:`, result)
          results.push({ email: invitation.email, success: result.success, error: result.error })
        } else {
          const result = await sendInvitationEmail(emailData)
          console.log(`📧 Invitation email result for ${invitation.email}:`, result)
          results.push({ email: invitation.email, success: result.success, error: result.error })
        }
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${invitation.email}:`, emailError)
        results.push({ 
          email: invitation.email, 
          success: false, 
          error: emailError instanceof Error ? emailError.message : 'Unknown error' 
        })
      }
    }

    return { success: true, results }
  } catch (error) {
    console.error('Error sending invitation emails:', error)
    return { error: 'Failed to send invitation emails' }
  }
} 