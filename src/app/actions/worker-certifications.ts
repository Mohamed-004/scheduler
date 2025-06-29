'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface WorkerCertification {
  id: string
  worker_id: string
  certification_name: string
  proficiency_level: number
  certified_date?: string
  expiry_date?: string
  certifying_body?: string
  certificate_number?: string
  is_verified: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateCertificationData {
  certification_name: string
  proficiency_level?: number
  certified_date?: string
  expiry_date?: string
  certifying_body?: string
  certificate_number?: string
  notes?: string
}

export async function getWorkerCertifications(workerId?: string) {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    let targetWorkerId = workerId

    // If no workerId provided, get current user's worker record
    if (!targetWorkerId) {
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (workerError || !workerData) {
        return { success: false, error: 'Worker profile not found' }
      }
      targetWorkerId = workerData.id
    }

    // Get certifications
    const { data: certifications, error } = await supabase
      .from('worker_certifications')
      .select('*')
      .eq('worker_id', targetWorkerId)
      .order('certification_name', { ascending: true })

    if (error) {
      console.error('Error fetching worker certifications:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: certifications as WorkerCertification[] }
  } catch (error: any) {
    console.error('Error in getWorkerCertifications:', error)
    return { success: false, error: error.message }
  }
}

export async function createWorkerCertification(workerId: string, data: CreateCertificationData) {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    // Check if user can modify this worker's certifications
    if (userProfile.role === 'worker') {
      // Workers can only modify their own certifications
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', workerId)
        .single()

      if (workerError || !workerData) {
        return { success: false, error: 'You can only modify your own certifications' }
      }
    } else if (!['admin', 'sales'].includes(userProfile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Create the certification
    const { data: newCertification, error } = await supabase
      .from('worker_certifications')
      .insert([{
        worker_id: workerId,
        certification_name: data.certification_name,
        proficiency_level: data.proficiency_level || 1,
        certified_date: data.certified_date || null,
        expiry_date: data.expiry_date || null,
        certifying_body: data.certifying_body || null,
        certificate_number: data.certificate_number || null,
        notes: data.notes || null,
        is_verified: userProfile.role === 'admin' // Admins can auto-verify
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating worker certification:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/workers')
    revalidatePath(`/dashboard/workers/${workerId}`)
    return { success: true, data: newCertification }
  } catch (error: any) {
    console.error('Error in createWorkerCertification:', error)
    return { success: false, error: error.message }
  }
}

export async function updateWorkerCertification(
  certificationId: string, 
  data: Partial<CreateCertificationData>
) {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    // Get the certification to check ownership
    const { data: certification, error: certError } = await supabase
      .from('worker_certifications')
      .select('worker_id, workers(user_id)')
      .eq('id', certificationId)
      .single()

    if (certError || !certification) {
      return { success: false, error: 'Certification not found' }
    }

    // Check permissions
    if (userProfile.role === 'worker') {
      // Workers can only modify their own certifications
      if (certification.workers?.user_id !== user.id) {
        return { success: false, error: 'You can only modify your own certifications' }
      }
    } else if (!['admin', 'sales'].includes(userProfile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Update the certification
    const { data: updatedCertification, error } = await supabase
      .from('worker_certifications')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', certificationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating worker certification:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/workers')
    revalidatePath(`/dashboard/workers/${certification.worker_id}`)
    return { success: true, data: updatedCertification }
  } catch (error: any) {
    console.error('Error in updateWorkerCertification:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteWorkerCertification(certificationId: string) {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    // Get the certification to check ownership
    const { data: certification, error: certError } = await supabase
      .from('worker_certifications')
      .select('worker_id, workers(user_id)')
      .eq('id', certificationId)
      .single()

    if (certError || !certification) {
      return { success: false, error: 'Certification not found' }
    }

    // Check permissions
    if (userProfile.role === 'worker') {
      // Workers can only delete their own certifications
      if (certification.workers?.user_id !== user.id) {
        return { success: false, error: 'You can only delete your own certifications' }
      }
    } else if (!['admin', 'sales'].includes(userProfile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Delete the certification
    const { error } = await supabase
      .from('worker_certifications')
      .delete()
      .eq('id', certificationId)

    if (error) {
      console.error('Error deleting worker certification:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/workers')
    revalidatePath(`/dashboard/workers/${certification.worker_id}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteWorkerCertification:', error)
    return { success: false, error: error.message }
  }
}

export async function verifyCertification(certificationId: string, isVerified: boolean) {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    // Only admins can verify certifications
    if (userProfile.role !== 'admin') {
      return { success: false, error: 'Only administrators can verify certifications' }
    }

    // Update verification status
    const { data: updatedCertification, error } = await supabase
      .from('worker_certifications')
      .update({
        is_verified: isVerified,
        updated_at: new Date().toISOString()
      })
      .eq('id', certificationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating certification verification:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/workers')
    return { success: true, data: updatedCertification }
  } catch (error: any) {
    console.error('Error in verifyCertification:', error)
    return { success: false, error: error.message }
  }
}

export async function getWorkerCertificationStats(workerId: string) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get certification stats
    const { data: stats, error } = await supabase
      .rpc('get_worker_certification_stats', { p_worker_id: workerId })

    if (error) {
      console.error('Error getting certification stats:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: stats }
  } catch (error: any) {
    console.error('Error in getWorkerCertificationStats:', error)
    return { success: false, error: error.message }
  }
}