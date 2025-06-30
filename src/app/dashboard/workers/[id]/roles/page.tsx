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

  // Get current worker role assignments
  const { data: currentAssignments } = await supabase
    .from('worker_role_assignments')
    .select(`
      *,
      job_role:job_roles(
        id,
        name,
        description,
        color_code,
        hourly_rate_base
      )
    `)
    .eq('worker_id', worker.user?.id)
    .order('assigned_at', { ascending: false })

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
        workerId={worker.user?.id || ''}
        workerName={worker.name}
        availableRoles={availableRoles || []}
        currentAssignments={currentAssignments || []}
        userRole={userProfile.role}
      />
    </div>
  )
}