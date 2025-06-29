'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ScheduleException {
  id: string
  type: 'vacation' | 'sick' | 'personal' | 'holiday' | 'emergency'
  title: string
  startDate: string
  endDate: string
  isFullDay: boolean
  startTime?: string
  endTime?: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  createdAt: string
}

export async function getWorkerExceptions(workerId: string) {
  try {
    const supabase = await createClient()
    
    const { data: worker, error } = await supabase
      .from('workers')
      .select('schedule_exceptions, name, user_id')
      .eq('id', workerId)
      .single()

    if (error) {
      console.error('Error fetching worker exceptions:', error)
      return { success: false, error: error.message }
    }

    if (!worker) {
      return { success: false, error: 'Worker not found' }
    }

    return {
      success: true,
      data: {
        exceptions: (worker.schedule_exceptions as ScheduleException[]) || [],
        workerName: worker.name,
        userId: worker.user_id
      }
    }
  } catch (error: any) {
    console.error('Error in getWorkerExceptions:', error)
    return { success: false, error: error.message }
  }
}

export async function createScheduleException(workerId: string, exception: Omit<ScheduleException, 'id' | 'createdAt'>) {
  try {
    const supabase = await createClient()
    
    // Add ID and timestamp to the exception
    const fullException: ScheduleException = {
      ...exception,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    }
    
    // Call the database function that handles security checks
    const { data, error } = await supabase.rpc('add_schedule_exception', {
      p_worker_id: workerId,
      p_exception: fullException
    })

    if (error) {
      console.error('Error creating schedule exception:', error)
      return { success: false, error: error.message }
    }

    // Revalidate the page to show updated data
    revalidatePath(`/dashboard/workers/${workerId}/exceptions`)
    revalidatePath(`/dashboard/workers/${workerId}`)
    
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in createScheduleException:', error)
    return { success: false, error: error.message }
  }
}

export async function updateScheduleException(workerId: string, exceptionId: string, updates: Partial<ScheduleException>) {
  try {
    const supabase = await createClient()
    
    // Get current exceptions
    const { data: worker, error: fetchError } = await supabase
      .from('workers')
      .select('schedule_exceptions')
      .eq('id', workerId)
      .single()

    if (fetchError || !worker) {
      return { success: false, error: 'Worker not found' }
    }

    const exceptions = (worker.schedule_exceptions as ScheduleException[]) || []
    const exceptionIndex = exceptions.findIndex(ex => ex.id === exceptionId)
    
    if (exceptionIndex === -1) {
      return { success: false, error: 'Exception not found' }
    }

    // Update the exception
    exceptions[exceptionIndex] = { ...exceptions[exceptionIndex], ...updates }

    // Update the database
    const { error: updateError } = await supabase
      .from('workers')
      .update({ 
        schedule_exceptions: exceptions,
        updated_at: new Date().toISOString()
      })
      .eq('id', workerId)

    if (updateError) {
      console.error('Error updating schedule exception:', updateError)
      return { success: false, error: updateError.message }
    }

    // Revalidate the page to show updated data
    revalidatePath(`/dashboard/workers/${workerId}/exceptions`)
    revalidatePath(`/dashboard/workers/${workerId}`)
    
    return { success: true }
  } catch (error: any) {
    console.error('Error in updateScheduleException:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteScheduleException(workerId: string, exceptionId: string) {
  try {
    const supabase = await createClient()
    
    // Get current exceptions
    const { data: worker, error: fetchError } = await supabase
      .from('workers')
      .select('schedule_exceptions')
      .eq('id', workerId)
      .single()

    if (fetchError || !worker) {
      return { success: false, error: 'Worker not found' }
    }

    const exceptions = (worker.schedule_exceptions as ScheduleException[]) || []
    const filteredExceptions = exceptions.filter(ex => ex.id !== exceptionId)

    // Update the database
    const { error: updateError } = await supabase
      .from('workers')
      .update({ 
        schedule_exceptions: filteredExceptions,
        updated_at: new Date().toISOString()
      })
      .eq('id', workerId)

    if (updateError) {
      console.error('Error deleting schedule exception:', updateError)
      return { success: false, error: updateError.message }
    }

    // Revalidate the page to show updated data
    revalidatePath(`/dashboard/workers/${workerId}/exceptions`)
    revalidatePath(`/dashboard/workers/${workerId}`)
    
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteScheduleException:', error)
    return { success: false, error: error.message }
  }
}

export async function approveScheduleException(workerId: string, exceptionId: string) {
  return await updateScheduleException(workerId, exceptionId, { status: 'approved' })
}

export async function rejectScheduleException(workerId: string, exceptionId: string) {
  return await updateScheduleException(workerId, exceptionId, { status: 'rejected' })
}

export async function getExceptionsSummary(workerId: string) {
  try {
    const result = await getWorkerExceptions(workerId)
    
    if (!result.success) {
      return result
    }

    const exceptions = result.data?.exceptions || []
    
    const summary = {
      total: exceptions.length,
      approved: exceptions.filter(ex => ex.status === 'approved').length,
      pending: exceptions.filter(ex => ex.status === 'pending').length,
      rejected: exceptions.filter(ex => ex.status === 'rejected').length,
      vacation: exceptions.filter(ex => ex.type === 'vacation').length,
      sick: exceptions.filter(ex => ex.type === 'sick').length,
      personal: exceptions.filter(ex => ex.type === 'personal').length,
      holiday: exceptions.filter(ex => ex.type === 'holiday').length,
      emergency: exceptions.filter(ex => ex.type === 'emergency').length,
    }

    return { success: true, data: summary }
  } catch (error: any) {
    console.error('Error in getExceptionsSummary:', error)
    return { success: false, error: error.message }
  }
}