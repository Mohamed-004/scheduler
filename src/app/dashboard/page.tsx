import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardCards } from '@/components/dashboard/dashboard-cards'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/signin')
  }

  // Get user profile for role checking
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/auth/setup')
  }

  // Fetch dashboard data based on user role
  let dashboardData = {
    totalJobs: 0,
    pendingJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalWorkers: 0,
    activeWorkers: 0,
    totalClients: 0,
    totalCrews: 0,
    totalRevenue: 0
  }

  try {
    // Fetch jobs data
    let jobsQuery = supabase
      .from('jobs')
      .select('*')

    if (userProfile.role === 'worker') {
      // Workers can only see jobs for their crews
      const { data: workerRecord } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (workerRecord) {
        const { data: workerCrews } = await supabase
          .from('crew_workers')
          .select('crew_id')
          .eq('worker_id', workerRecord.id)

        if (workerCrews && workerCrews.length > 0) {
          const crewIds = workerCrews.map(cw => cw.crew_id)
          jobsQuery = jobsQuery.in('crew_id', crewIds)
        } else {
          // Worker not in any crew, they'll see empty dashboard
          const { data: jobs } = await jobsQuery.eq('id', 'none')
          
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                  <p className="text-muted-foreground">
                    Welcome to the Dynamic Crew Scheduler
                  </p>
                </div>
              </div>
              
              <DashboardCards 
                data={dashboardData}
                userRole={userProfile.role as 'admin' | 'sales' | 'worker' | 'client'}
              />
            </div>
          )
        }
      }
    }

    const { data: jobs } = await jobsQuery

    // Calculate job statistics
    if (jobs) {
      dashboardData.totalJobs = jobs.length
      dashboardData.pendingJobs = jobs.filter(j => j.status === 'PENDING').length
      dashboardData.activeJobs = jobs.filter(j => j.status === 'SCHEDULED' || j.status === 'IN_PROGRESS').length
      dashboardData.completedJobs = jobs.filter(j => j.status === 'COMPLETED').length
      dashboardData.totalRevenue = jobs
        .filter(j => j.status === 'COMPLETED')
        .reduce((sum, job) => sum + (job.quote_amount || 0), 0)
    }

    // Fetch additional data for admin/sales users
    if (userProfile.role === 'admin' || userProfile.role === 'sales') {
      const [workersResult, clientsResult, crewsResult] = await Promise.all([
        supabase.from('workers').select('id, is_active'),
        supabase.from('clients').select('id'),
        supabase.from('crews').select('id, is_active')
      ])

      if (workersResult.data) {
        dashboardData.totalWorkers = workersResult.data.length
        dashboardData.activeWorkers = workersResult.data.filter(w => w.is_active).length
      }

      if (clientsResult.data) {
        dashboardData.totalClients = clientsResult.data.length
      }

      if (crewsResult.data) {
        dashboardData.totalCrews = crewsResult.data.length
      }
    }

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to the Dynamic Crew Scheduler
          </p>
        </div>
      </div>
      
      <DashboardCards 
        data={dashboardData}
        userRole={userProfile.role as 'admin' | 'sales' | 'worker' | 'client'}
      />
    </div>
  )
} 