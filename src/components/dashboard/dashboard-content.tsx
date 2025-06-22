'use client'

import { DashboardCards } from './dashboard-cards'
import { useDashboardData } from '@/hooks/use-dashboard-data'

interface DashboardContentProps {
  userRole: string
}

export function DashboardContent({ userRole }: DashboardContentProps) {
  const { data: dashboardData, isLoading, error } = useDashboardData()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Error loading dashboard data</p>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  // Transform the data to match DashboardCards expected format
  const cardsData = {
    totalJobs: dashboardData.totalJobs,
    pendingJobs: dashboardData.pendingJobs,
    activeJobs: dashboardData.activeJobs,
    completedJobs: dashboardData.completedJobs,
    totalWorkers: dashboardData.totalWorkers,
    activeWorkers: dashboardData.activeWorkers,
    totalClients: dashboardData.totalClients,
    totalCrews: dashboardData.totalCrews,
    totalRevenue: 0 // TODO: Calculate from completed jobs
  }

  return (
    <DashboardCards 
      data={cardsData} 
      userRole={userRole as 'admin' | 'sales' | 'worker' | 'client'} 
    />
  )
} 