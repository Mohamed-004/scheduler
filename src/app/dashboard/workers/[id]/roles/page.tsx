/**
 * Worker Roles Management Page
 * Allows admins and sales to assign job roles to workers
 */

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Award } from 'lucide-react'
import { WorkerRolesManager } from '@/components/workers/worker-roles-manager'

interface WorkerRolesPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkerRolesPage({ params }: WorkerRolesPageProps) {
  const supabase = await createClient()
  const { id } = await params
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/auth/signin')
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('team_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !userProfile) {
    redirect('/dashboard')
  }

  // Get worker details
  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .select(`
      *,
      user:users(id, email, role, team_id)
    `)
    .eq('id', id)
    .single()

  if (workerError || !worker) {
    notFound()
  }

  // Check if user can access this worker's roles
  const canAccess = 
    ['admin', 'sales'].includes(userProfile.role) && userProfile.team_id === worker.user?.team_id

  if (!canAccess) {
    redirect('/dashboard')
  }

  // Get available job roles for the team
  const { data: availableRoles } = await supabase
    .from('job_roles')
    .select('*')
    .eq('team_id', userProfile.team_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Get current worker capabilities (with fallback to empty array if table doesn't exist)
  let currentAssignments: any[] = []
  
  console.log('🔍 WORKER CAPABILITIES DEBUG:', {
    worker_id: id,
    worker_user_id: worker.user_id,
    worker_team_id: worker.user?.team_id,
    current_user_team_id: userProfile.team_id,
    worker_name: worker.name,
    user_role: userProfile.role
  })
  
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

    // Get job roles separately to avoid relationship ambiguity
    let jobRolesMap = new Map()
    if (data && data.length > 0) {
      const roleIds = [...new Set(data.map(cap => cap.job_role_id))]
      const { data: jobRoles } = await supabase
        .from('job_roles')
        .select('id, name, description, color_code')
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
    
    console.log('🔍 WORKER CAPABILITIES QUERY RESULT:', {
      error,
      data_length: data?.length || 0,
      data_sample: data?.slice(0, 2) || null,
      dataWithRoles_length: dataWithRoles?.length || 0,
      query_worker_id: worker.user_id
    })
    
    if (!error) {
      currentAssignments = dataWithRoles || []
      console.log('✅ WORKER CAPABILITIES: Successfully loaded', currentAssignments.length, 'capabilities')
    } else {
      console.error('❌ WORKER CAPABILITIES ERROR DETAILS:', {
        error_message: error.message,
        error_code: error.code,
        error_details: error.details,
        error_hint: error.hint,
        worker_user_id: worker.user_id,
        team_context: userProfile.team_id
      })
      currentAssignments = []
    }
  } catch (error) {
    console.error('❌ WORKER CAPABILITIES CATCH ERROR:', {
      error_message: error.message,
      error_stack: error.stack,
      worker_context: {
        worker_id: id,
        worker_user_id: worker.user_id,
        team_id: userProfile.team_id
      }
    })
    currentAssignments = []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/workers/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Worker
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Award className="h-6 w-6 mr-2" />
              {worker.name} - Role Assignments
            </h1>
            <p className="text-muted-foreground">
              Manage job role assignments and capabilities
            </p>
          </div>
        </div>
      </div>

      {/* Roles Manager */}
      <WorkerRolesManager
        workerId={worker.user_id || ''}
        workerName={worker.name}
        availableRoles={availableRoles || []}
        currentAssignments={currentAssignments || []}
        userRole={userProfile.role}
      />
    </div>
  )
}