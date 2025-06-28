'use client'

import Link from 'next/link'
import { CalendarDays, Users, Briefcase, UserCheck, Building2, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDashboardData } from '@/hooks/use-dashboard-data'

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-800'
    case 'pending':
      return 'bg-gray-100 text-gray-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
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

export default function DashboardContent() {
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
                          {job.title}
                        </Link>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {job.client?.name} • {job.assigned_worker?.name || 'Unassigned'}
                      </p>
                      {job.scheduled_start && (
                        <p className="text-xs text-gray-500">
                          Scheduled: {formatDateTime(job.scheduled_start)}
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