'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { 
  TeamDashboardStats, 
  Job, 
  User, 
  Client, 
  JobWithRelations,
  Team 
} from '@/types/database'

interface DashboardData {
  stats: TeamDashboardStats | null
  recentJobs: JobWithRelations[]
  teamMembers: User[]
  clients: Client[]
  loading: boolean
  error: string | null
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    recentJobs: [],
    teamMembers: [],
    clients: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    async function fetchDashboardData() {
      const supabase = createClient()

      try {
        // Get current user and their team
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          throw new Error('User not authenticated')
        }

        // Get user profile with team info
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select(`
            *,
            team:teams(*)
          `)
          .eq('id', user.id)
          .single()

        if (profileError || !userProfile) {
          throw new Error('Failed to fetch user profile')
        }

        const teamId = userProfile.team_id

        // Fetch all team data in parallel for performance
        const [
          { data: jobs, error: jobsError },
          { data: teamMembers, error: membersError },
          { data: clients, error: clientsError }
        ] = await Promise.all([
          // Jobs with relations
          supabase
            .from('jobs')
            .select(`
              *,
              client:clients(*),
              assigned_worker:users(id, name, email, role),
              team:teams(*)
            `)
            .eq('team_id', teamId)
            .order('created_at', { ascending: false })
            .limit(20),

          // Team members
          supabase
            .from('users')
            .select('*')
            .eq('team_id', teamId)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

          // Clients
          supabase
            .from('clients')
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false })
        ])

        if (jobsError) throw new Error(`Jobs error: ${jobsError.message}`)
        if (membersError) throw new Error(`Members error: ${membersError.message}`)
        if (clientsError) throw new Error(`Clients error: ${clientsError.message}`)

        // Calculate dashboard statistics
        const totalJobs = jobs?.length || 0
        const activeJobs = jobs?.filter(job => 
          ['SCHEDULED', 'IN_PROGRESS'].includes(job.status)
        ).length || 0
        const completedJobs = jobs?.filter(job => 
          job.status === 'COMPLETED'
        ).length || 0
        const pendingJobs = jobs?.filter(job => 
          job.status === 'PENDING'
        ).length || 0

        const activeWorkers = teamMembers?.filter(member => 
          member.role === 'worker' && member.is_active
        ).length || 0

        const recentJobs = jobs?.slice(0, 10) || []

        const stats: TeamDashboardStats = {
          team: userProfile.team,
          total_jobs: totalJobs,
          active_jobs: activeJobs,
          completed_jobs: completedJobs,
          pending_jobs: pendingJobs,
          total_team_members: teamMembers?.length || 0,
          active_workers: activeWorkers,
          total_clients: clients?.length || 0,
          recent_jobs: recentJobs
        }

        if (isMounted) {
          setData({
            stats,
            recentJobs,
            teamMembers: teamMembers || [],
            clients: clients || [],
            loading: false,
            error: null,
          })
        }

      } catch (error) {
        console.error('Dashboard data fetch error:', error)
        if (isMounted) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          }))
        }
      }
    }

    fetchDashboardData()

    // Set up real-time subscriptions for team data
    const supabase = createClient()
    
    const jobsSubscription = supabase
      .channel('dashboard-jobs')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          console.log('Jobs changed, refetching dashboard data...')
          fetchDashboardData()
        }
      )
      .subscribe()

    const usersSubscription = supabase
      .channel('dashboard-users')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' },
        () => {
          console.log('Users changed, refetching dashboard data...')
          fetchDashboardData()
        }
      )
      .subscribe()

    const clientsSubscription = supabase
      .channel('dashboard-clients')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          console.log('Clients changed, refetching dashboard data...')
          fetchDashboardData()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(jobsSubscription)
      supabase.removeChannel(usersSubscription)
      supabase.removeChannel(clientsSubscription)
    }
  }, [])

  const refreshData = async () => {
    setData(prev => ({ ...prev, loading: true }))
    // Trigger useEffect to refetch data
    window.location.reload()
  }

  return {
    ...data,
    refreshData,
  }
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