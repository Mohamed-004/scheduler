'use client'

import Link from 'next/link'
import { CalendarDays, Users, Briefcase, UserCheck, Building2, MapPin, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkerJobStatusUpdater } from '@/components/jobs/worker-job-status-updater'

interface DashboardContentProps {
  userRole: string
  userId: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800'
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800'
    case 'SCHEDULED':
      return 'bg-yellow-100 text-yellow-800'
    case 'PENDING':
      return 'bg-gray-100 text-gray-800'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PENDING':
      return <Clock className="h-4 w-4" />
    case 'SCHEDULED':
      return <CalendarDays className="h-4 w-4" />
    case 'IN_PROGRESS':
      return <AlertTriangle className="h-4 w-4" />
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const formatDateTime = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid Date'
  }
}

// Worker Dashboard Component
const WorkerDashboard = ({ userId }: { userId: string }) => {
  const [workerJobs, setWorkerJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkerJobs = async () => {
      try {
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            id,
            job_type,
            status,
            estimated_hours,
            quote_amount,
            start_time,
            end_time,
            address,
            notes,
            created_at,
            client:clients(name, phone, email)
          `)
          .eq('assigned_worker_id', userId)
          .order('start_time', { ascending: true, nullsFirst: false })

        if (error) throw error
        setWorkerJobs(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkerJobs()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading your jobs: {error}</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  const scheduledJobs = workerJobs.filter(job => job.status === 'SCHEDULED')
  const inProgressJobs = workerJobs.filter(job => job.status === 'IN_PROGRESS')
  const completedJobs = workerJobs.filter(job => job.status === 'COMPLETED')

  return (
    <div className="space-y-6">
      {/* Worker Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Jobs</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready to start
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>My Assigned Jobs</CardTitle>
          <CardDescription>Jobs assigned to you and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {workerJobs.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No jobs assigned yet</p>
              <p className="text-sm text-muted-foreground">
                Check back later or contact your supervisor for job assignments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workerJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {getStatusIcon(job.status)}
                    </div>
                    
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{job.job_type}</h3>
                        <Badge className={`${getStatusColor(job.status)} border`}>
                          {job.status.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <strong>Client:</strong> {job.client?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Address:</strong> {job.address}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{job.estimated_hours}h estimated</span>
                          {job.start_time && (
                            <>
                              <span>•</span>
                              <span>Start: {new Date(job.start_time).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                        {job.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <strong>Notes:</strong> {job.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <WorkerJobStatusUpdater 
                    jobId={job.id}
                    currentStatus={job.status}
                    jobType={job.job_type}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardContent({ userRole, userId }: DashboardContentProps) {
  // Show worker dashboard for workers
  if (userRole === 'worker') {
    return <WorkerDashboard userId={userId} />
  }

  // Show admin/sales dashboard for admin and sales
  const { stats, recentJobs, teamMembers, clients, loading, error } = useDashboardData()

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading dashboard: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No team data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{stats.team.name}</h1>
          <p className="text-gray-600">Team Dashboard</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_jobs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_jobs} active, {stats.completed_jobs} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_jobs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending_jobs} pending scheduling
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_team_members}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_workers} active workers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_clients}</div>
            <p className="text-xs text-muted-foreground">
              Total client base
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Latest job activities for your team</CardDescription>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No jobs found</p>
                <Link 
                  href="/dashboard/jobs/new" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Your First Job
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link 
                          href={`/dashboard/jobs/${job.id}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {job.job_type}
                        </Link>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {job.client?.name} • {job.assigned_worker?.name || 'Unassigned'}
                      </p>
                      {job.start_time && (
                        <p className="text-xs text-gray-500">
                          Scheduled: {formatDateTime(job.start_time)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {job.quote_amount && (
                        <p className="font-medium">${job.quote_amount}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatDateTime(job.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-4">
                  <Link 
                    href="/dashboard/jobs" 
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View all jobs →
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Team Overview</CardTitle>
            <CardDescription>Your team members and their roles</CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No team members</p>
                <Link 
                  href="/dashboard/team/invite" 
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Invite Team Members
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                    <Badge variant="outline">
                      {member.role}
                    </Badge>
                  </div>
                ))}
                {teamMembers.length > 5 && (
                  <p className="text-sm text-gray-500 pt-2">
                    And {teamMembers.length - 5} more...
                  </p>
                )}
                <div className="pt-4">
                  <Link 
                    href="/dashboard/team" 
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Manage team →
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link 
              href="/dashboard/jobs/new"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Briefcase className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Create Job</span>
            </Link>
            <Link 
              href="/dashboard/team/invite"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Users className="h-5 w-5 text-green-600" />
              <span className="font-medium">Invite Member</span>
            </Link>
            <Link 
              href="/dashboard/jobs"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <CalendarDays className="h-5 w-5 text-purple-600" />
              <span className="font-medium">View Schedule</span>
            </Link>
            <Link 
              href="/dashboard/settings"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Building2 className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Team Settings</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 