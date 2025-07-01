/**
 * Worker Detail Page
 * Manages worker schedules, availability, and special exceptions
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Star,
  MapPin,
  Settings,
  Award,
  DollarSign
} from 'lucide-react'
import { PayRateManager } from '@/components/workers/pay-rate-manager'

interface WorkerDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkerDetailPage({ params }: WorkerDetailPageProps) {
  const supabase = await createClient()
  const { id } = await params
  
  // Get current user for role checking
  const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
  
  console.log('🔍 AUTH DEBUG:', {
    currentUser_id: currentUser?.id,
    userError,
    has_currentUser: !!currentUser
  })
  
  let currentUserRole = 'worker' // Default role
  if (currentUser && !userError) {
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('role, team_id')
      .eq('id', currentUser.id)
      .single()
    
    console.log('🔍 USER PROFILE DEBUG:', {
      currentUserProfile,
      profileError
    })
    
    if (currentUserProfile) {
      currentUserRole = currentUserProfile.role
    }
  }
  
  // Get worker details with user information
  const { data: worker, error } = await supabase
    .from('workers')
    .select(`
      *,
      user:users(id, email, role, tz)
    `)
    .eq('id', id)
    .single()

  if (error || !worker) {
    notFound()
  }

  // Get worker capabilities (roles) - Using the same approach as working roles page
  console.log('🔍 WORKER DETAIL PAGE DEBUG:', {
    worker_id: id,
    worker_user_id: worker.user_id,
    worker_name: worker.name,
    current_user_id: currentUser?.id,
    current_user_role: currentUserRole
  })
  
  let workerRoles: any[] = []
  
  try {
    const { data, error } = await supabase
      .from('worker_capabilities')
      .select(`
        id,
        job_role_id,
        is_lead,
        proficiency_level,
        notes,
        assigned_at
      `)
      .eq('worker_id', worker.user_id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    // Get job roles separately to avoid relationship issues
    let jobRolesMap = new Map()
    if (data && data.length > 0) {
      const roleIds = [...new Set(data.map(cap => cap.job_role_id))]
      const { data: jobRoles } = await supabase
        .from('job_roles')
        .select('id, name, description, color_code, hourly_rate_base')
        .in('id', roleIds)
      
      if (jobRoles) {
        jobRoles.forEach(role => jobRolesMap.set(role.id, role))
      }
    }

    // Combine the data
    const dataWithRoles = data?.map(capability => ({
      ...capability,
      job_role: jobRolesMap.get(capability.job_role_id) || null
    }))
    
    console.log('🔍 WORKER DETAIL CAPABILITIES RESULT:', {
      error,
      data_length: data?.length || 0,
      dataWithRoles_length: dataWithRoles?.length || 0,
      data_sample: dataWithRoles?.slice(0, 2) || null
    })
    
    if (!error) {
      workerRoles = dataWithRoles || []
    } else {
      console.error('❌ WORKER DETAIL CAPABILITIES ERROR:', error)
      workerRoles = []
    }
  } catch (error) {
    console.error('❌ WORKER DETAIL CAPABILITIES CATCH ERROR:', error)
    workerRoles = []
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/workers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workers
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{worker.name}</h1>
            <p className="text-muted-foreground">{worker.user?.email}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={worker.is_active ? "default" : "secondary"}>
            {worker.is_active ? "Active" : "Inactive"}
          </Badge>
          <Link href={`/dashboard/workers/${id}/schedule`}>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Manage Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Worker Information */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Worker Information</CardTitle>
            <CardDescription>Basic worker details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Name:</span>
              </div>
              <p className="text-sm pl-6 font-medium">{worker.name}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Phone:</span>
              </div>
              <p className="text-sm pl-6">
                {worker.phone ? (
                  <a href={`tel:${worker.phone}`} className="text-blue-600 hover:underline">
                    {worker.phone}
                  </a>
                ) : (
                  'Not provided'
                )}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Rating:</span>
              </div>
              <p className="text-sm pl-6">
                {worker.rating ? `${worker.rating}/5.0` : 'No rating yet'}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Weekly Hours:</span>
              </div>
              <p className="text-sm pl-6">{worker.weekly_hours || 0} hours</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>User account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email:</span>
              </div>
              <p className="text-sm pl-6">{worker.user?.email}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Role:</span>
              </div>
              <p className="text-sm pl-6 capitalize">{worker.user?.role}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Joined:</span>
              </div>
              <p className="text-sm pl-6">
                {new Date(worker.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage worker schedules and availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="mb-4">
                <Link href={`/dashboard/workers/${id}/schedule`}>
                  <Button variant="outline" className="w-full h-14 text-left justify-start p-4">
                    <Calendar className="h-5 w-5 mr-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Manage Schedule</div>
                      <div className="text-xs text-muted-foreground mt-1">Set working hours and patterns</div>
                    </div>
                  </Button>
                </Link>
              </div>
              
              <div className="mb-4">
                <Link href={`/dashboard/workers/${id}/exceptions`}>
                  <Button variant="outline" className="w-full h-14 text-left justify-start p-4">
                    <Settings className="h-5 w-5 mr-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Special Exceptions</div>
                      <div className="text-xs text-muted-foreground mt-1">Time off and holidays</div>
                    </div>
                  </Button>
                </Link>
              </div>
              
              <div className="mb-4">
                <Link href={`/dashboard/workers/${id}/roles`}>
                  <Button variant="outline" className="w-full h-14 text-left justify-start p-4">
                    <Award className="h-5 w-5 mr-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Manage Roles</div>
                      <div className="text-xs text-muted-foreground mt-1">Job capabilities and skills</div>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pay Rate Management */}
      <PayRateManager 
        userId={worker.user?.id || ''}
        userRole={currentUserRole as 'admin' | 'sales' | 'worker'}
      />

      {/* Job Roles Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job Roles & Assignments</CardTitle>
              <CardDescription>
                Current role assignments and qualifications
              </CardDescription>
            </div>
            <Link href={`/dashboard/workers/${id}/roles`}>
              <Button variant="outline">
                <Award className="h-4 w-4 mr-2" />
                Manage Roles
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {workerRoles && workerRoles.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {workerRoles.slice(0, 6).map((assignment: any) => (
                <div key={assignment.id} className="p-3 border rounded-lg" style={{ borderLeftColor: assignment.job_role?.color_code || '#3B82F6', borderLeftWidth: '4px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{assignment.job_role?.name}</h4>
                    {assignment.is_lead && (
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">Lead</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {assignment.job_role?.description && (
                      <div className="mb-1">{assignment.job_role.description}</div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span>Level {assignment.proficiency_level}/5</span>
                      {assignment.job_role?.hourly_rate_base && (
                        <span>• Base rate: ${assignment.job_role.hourly_rate_base}/hr</span>
                      )}
                    </div>
                    <div className="mt-1">
                      Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              {workerRoles.length > 6 && (
                <div className="p-3 border rounded-lg border-dashed flex items-center justify-center">
                  <Link href={`/dashboard/workers/${id}/roles`}>
                    <Button variant="ghost" size="sm">
                      +{workerRoles.length - 6} more
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-sm mb-2">No roles assigned</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Assign job roles to this worker to track their capabilities
              </p>
              <Link href={`/dashboard/workers/${id}/roles`}>
                <Button size="sm">
                  <Award className="h-4 w-4 mr-2" />
                  Assign Roles
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Management */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Management</CardTitle>
          <CardDescription>
            Manage this worker's regular schedule and special exceptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Regular Schedule</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Set weekly recurring work hours and patterns
              </p>
              <Link href={`/dashboard/workers/${id}/schedule`}>
                <Button size="sm" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Schedule
                </Button>
              </Link>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Special Exceptions</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Handle time off, holidays, and special circumstances
              </p>
              <Link href={`/dashboard/workers/${id}/exceptions`}>
                <Button size="sm" variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Exceptions
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 