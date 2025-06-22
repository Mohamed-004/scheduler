'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface DashboardStats {
  totalJobs: number
  activeJobs: number
  completedJobs: number
  pendingJobs: number
  totalWorkers: number
  activeWorkers: number
  totalCrews: number
  activeCrews: number
  totalClients: number
  recentJobs: Array<{
    id: string
    job_type: string
    status: string
    client_name: string
    start: string
    created_at: string
  }>
  recentActivity: Array<{
    id: string
    type: 'job_created' | 'job_completed' | 'worker_assigned'
    message: string
    timestamp: string
  }>
}

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const supabase = createClient()

  try {
    // Fetch jobs with client information
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        job_type,
        status,
        start,
        created_at,
        client:clients(name)
      `)
      .order('created_at', { ascending: false })

    if (jobsError) throw jobsError

    // Fetch workers
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, is_active')

    if (workersError) throw workersError

    // Fetch crews
    const { data: crews, error: crewsError } = await supabase
      .from('crews')
      .select('id, is_active')

    if (crewsError) throw crewsError

    // Fetch clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')

    if (clientsError) throw clientsError

    // Safely access jobs data
    const safeJobs = jobs || []

    // Calculate statistics
    const totalJobs = safeJobs.length
    const activeJobs = safeJobs.filter((job: any) => 
      job.status === 'SCHEDULED' || job.status === 'IN_PROGRESS'
    ).length
    const completedJobs = safeJobs.filter((job: any) => job.status === 'COMPLETED').length
    const pendingJobs = safeJobs.filter((job: any) => job.status === 'PENDING').length

    const totalWorkers = workers?.length || 0
    const activeWorkers = workers?.filter(worker => worker.is_active).length || 0

    const totalCrews = crews?.length || 0
    const activeCrews = crews?.filter(crew => crew.is_active).length || 0

    const totalClients = clients?.length || 0

    // Get recent jobs (last 5)
    const recentJobs = safeJobs.slice(0, 5).map((job: any) => ({
      id: job.id,
      job_type: job.job_type,
      status: job.status,
      client_name: job.client?.name || 'Unknown Client',
      start: job.start,
      created_at: job.created_at
    }))

    // Generate recent activity (mock for now, could be from timeline_items later)
    const recentActivity = safeJobs.slice(0, 3).map((job: any) => ({
      id: job.id,
      type: 'job_created' as const,
      message: `New job "${job.job_type}" created for ${job.client?.name || 'client'}`,
      timestamp: job.created_at
    }))

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      pendingJobs,
      totalWorkers,
      activeWorkers,
      totalCrews,
      activeCrews,
      totalClients,
      recentJobs,
      recentActivity
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    // Return default stats on error
    return {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      pendingJobs: 0,
      totalWorkers: 0,
      activeWorkers: 0,
      totalCrews: 0,
      activeCrews: 0,
      totalClients: 0,
      recentJobs: [],
      recentActivity: []
    }
  }
}

export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

// Hook for real-time updates
export const useDashboardRealtime = () => {
  const supabase = createClient()
  
  // This could be extended to subscribe to realtime changes
  // For now, we'll rely on the refetch interval
  return {
    subscribe: () => {
      // TODO: Implement Supabase realtime subscriptions
      // supabase.channel('dashboard').on('postgres_changes', ...)
    },
    unsubscribe: () => {
      // TODO: Implement cleanup
    }
  }
} 