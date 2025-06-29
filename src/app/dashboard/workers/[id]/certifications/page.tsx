/**
 * Worker Certifications Management Page
 * Allows workers and admins to manage certifications and skills
 */

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Award } from 'lucide-react'
import { WorkerCertificationsManager } from '@/components/workers/worker-certifications-manager'
import { getWorkerCertifications } from '@/app/actions/worker-certifications'

interface WorkerCertificationsPageProps {
  params: {
    id: string
  }
}

export default async function WorkerCertificationsPage({ params }: WorkerCertificationsPageProps) {
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

  // Check if user can access this worker's certifications
  const canAccess = 
    ['admin', 'sales'].includes(userProfile.role) && userProfile.team_id === worker.user?.team_id ||
    worker.user?.id === user.id

  if (!canAccess) {
    redirect('/dashboard')
  }

  // Determine if user can edit certifications
  const canEdit = 
    userProfile.role === 'admin' || 
    userProfile.role === 'sales' ||
    worker.user?.id === user.id

  // Get worker certifications
  const certificationsResult = await getWorkerCertifications(id)
  const certifications = certificationsResult.success ? certificationsResult.data || [] : []

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
              {worker.name} - Certifications
            </h1>
            <p className="text-muted-foreground">
              Manage certifications and skill levels
            </p>
          </div>
        </div>
      </div>

      {/* Certifications Manager */}
      <WorkerCertificationsManager
        workerId={id}
        initialCertifications={certifications}
        userRole={userProfile.role}
        canEdit={canEdit}
      />
    </div>
  )
}