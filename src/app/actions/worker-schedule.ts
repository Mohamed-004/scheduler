'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface DaySchedule {
  available: boolean
  start: string
  end: string
  break?: number
}

export interface WeeklySchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export interface ScheduleException {
  id: string
  type: 'vacation' | 'sick' | 'personal' | 'holiday' | 'emergency'
  title: string
  date: string
  startDate?: string
  endDate?: string
  isFullDay: boolean
  startTime?: string
  endTime?: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  createdAt: string
}

export async function getWorkerSchedule(workerId: string) {
  try {
    const supabase = await createClient()
    
    const { data: worker, error } = await supabase
      .from('workers')
      .select('default_schedule, schedule_exceptions, name, user_id')
      .eq('id', workerId)
      .single()

    if (error) {
      console.error('Error fetching worker schedule:', error)
      return { success: false, error: error.message }
    }

    if (!worker) {
      return { success: false, error: 'Worker not found' }
    }

    return {
      success: true,
      data: {
        schedule: worker.default_schedule as WeeklySchedule,
        exceptions: worker.schedule_exceptions as ScheduleException[],
        workerName: worker.name,
        userId: worker.user_id
      }
    }
  } catch (error: any) {
    console.error('Error in getWorkerSchedule:', error)
    return { success: false, error: error.message }
  }
}

export async function updateWorkerSchedule(workerId: string, schedule: WeeklySchedule) {
  try {
    const supabase = await createClient()
    
    // Call the database function that handles security checks
    const { data, error } = await supabase.rpc('update_worker_schedule', {
      p_worker_id: workerId,
      p_schedule: schedule
    })

    if (error) {
      console.error('Error updating worker schedule:', error)
      return { success: false, error: error.message }
    }

    // Revalidate the page to show updated data
    revalidatePath(`/dashboard/workers/${workerId}/schedule`)
    revalidatePath(`/dashboard/workers/${workerId}`)
    
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in updateWorkerSchedule:', error)
    return { success: false, error: error.message }
  }
}

export async function addScheduleException(workerId: string, exception: Omit<ScheduleException, 'id' | 'createdAt'>) {
  try {
    const supabase = await createClient()
    
    // Add ID and timestamp to the exception
    const fullException = {
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
      console.error('Error adding schedule exception:', error)
      return { success: false, error: error.message }
    }

    // Revalidate the page to show updated data
    revalidatePath(`/dashboard/workers/${workerId}/exceptions`)
    revalidatePath(`/dashboard/workers/${workerId}`)
    
    return { success: true, data }
  } catch (error: any) {
    console.error('Error in addScheduleException:', error)
    return { success: false, error: error.message }
  }
}

export async function applyScheduleTemplate(workerId: string, template: 'fulltime' | 'parttime' | 'weekend' | 'flexible') {
  const templates: Record<string, WeeklySchedule> = {
    fulltime: {
      monday: { available: true, start: '08:00', end: '17:00', break: 60 },
      tuesday: { available: true, start: '08:00', end: '17:00', break: 60 },
      wednesday: { available: true, start: '08:00', end: '17:00', break: 60 },
      thursday: { available: true, start: '08:00', end: '17:00', break: 60 },
      friday: { available: true, start: '08:00', end: '17:00', break: 60 },
      saturday: { available: false, start: '09:00', end: '17:00', break: 0 },
      sunday: { available: false, start: '09:00', end: '17:00', break: 0 }
    },
    parttime: {
      monday: { available: true, start: '09:00', end: '15:00', break: 30 },
      tuesday: { available: false, start: '09:00', end: '15:00', break: 0 },
      wednesday: { available: true, start: '09:00', end: '15:00', break: 30 },
      thursday: { available: false, start: '09:00', end: '15:00', break: 0 },
      friday: { available: true, start: '09:00', end: '15:00', break: 30 },
      saturday: { available: false, start: '09:00', end: '15:00', break: 0 },
      sunday: { available: false, start: '09:00', end: '15:00', break: 0 }
    },
    weekend: {
      monday: { available: false, start: '09:00', end: '17:00', break: 0 },
      tuesday: { available: false, start: '09:00', end: '17:00', break: 0 },
      wednesday: { available: false, start: '09:00', end: '17:00', break: 0 },
      thursday: { available: false, start: '09:00', end: '17:00', break: 0 },
      friday: { available: false, start: '09:00', end: '17:00', break: 0 },
      saturday: { available: true, start: '09:00', end: '17:00', break: 60 },
      sunday: { available: true, start: '09:00', end: '17:00', break: 60 }
    },
    flexible: {
      monday: { available: true, start: '10:00', end: '16:00', break: 45 },
      tuesday: { available: true, start: '10:00', end: '16:00', break: 45 },
      wednesday: { available: true, start: '10:00', end: '16:00', break: 45 },
      thursday: { available: true, start: '10:00', end: '16:00', break: 45 },
      friday: { available: true, start: '10:00', end: '16:00', break: 45 },
      saturday: { available: true, start: '12:00', end: '18:00', break: 30 },
      sunday: { available: false, start: '10:00', end: '16:00', break: 0 }
    }
  }

  const scheduleTemplate = templates[template]
  if (!scheduleTemplate) {
    return { success: false, error: 'Invalid template' }
  }

  return await updateWorkerSchedule(workerId, scheduleTemplate)
}

export async function getWorkerAvailabilityForDate(workerId: string, date: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('get_worker_availability', {
      p_worker_id: workerId,
      p_date: date
    })

    if (error) {
      console.error('Error getting worker availability:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getWorkerAvailabilityForDate:', error)
    return { success: false, error: error.message }
  }
}