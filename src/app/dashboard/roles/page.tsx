/**
 * Job Roles Management Page
 * Allows admin and sales to manage job roles for their team
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Briefcase, Settings, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { JobRolesManager } from '@/components/roles/job-roles-manager'
import { getJobRoles } from '@/app/actions/job-roles'

export default async function JobRolesPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/signin')
  }

  // Get user profile for role checking
  const { data: userProfile } = await supabase
    .from('users')
    .select('role, team_id')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/dashboard')
  }

  // Only admin and sales can access job roles
  if (!['admin', 'sales'].includes(userProfile.role)) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only administrators and sales personnel can manage job roles.</p>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Get job roles data
  const rolesResult = await getJobRoles()
  
  if (!rolesResult.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Job Roles</h2>
            <p className="text-muted-foreground">Manage job roles and requirements</p>
          </div>
        </div>
        
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error loading job roles: {rolesResult.error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const jobRoles = rolesResult.data || []
  const activeRoles = jobRoles.filter(role => role.is_active)
  const inactiveRoles = jobRoles.filter(role => !role.is_active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Job Roles</h2>
          <p className="text-muted-foreground">
            Define and manage job roles for your team
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobRoles.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeRoles.length} active, {inactiveRoles.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRoles.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for job assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role Types</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(jobRoles.map(role => role.physical_demands)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Different skill levels
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job Roles Manager */}
      <JobRolesManager initialRoles={jobRoles} userRole={userProfile.role} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for role management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link 
              href="/dashboard/workers"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Users className="h-5 w-5 text-green-600" />
              <span className="font-medium">Manage Workers</span>
            </Link>
            <Link 
              href="/dashboard/jobs/new"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Briefcase className="h-5 w-5 text-purple-600" />
              <span className="font-medium">Create Job</span>
            </Link>
            <Link 
              href="/dashboard/settings"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Settings className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Team Settings</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}