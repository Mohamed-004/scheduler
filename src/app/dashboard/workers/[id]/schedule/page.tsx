/**
 * Worker Schedule Management Page
 * Allows setting regular weekly schedules and recurring patterns
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import { ScheduleForm } from '@/components/workers/schedule-form'
import { getWorkerSchedule } from '@/app/actions/worker-schedule'

interface WorkerSchedulePageProps {
  params: {
    id: string
  }
}

export default async function WorkerSchedulePage({ params }: WorkerSchedulePageProps) {
  const supabase = await createClient()
  const { id } = await params
  
  // Get worker details
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

  // Get worker's schedule from database
  const scheduleResult = await getWorkerSchedule(id)
  
  if (!scheduleResult.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/workers/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Worker
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Schedule Management</h1>
            <p className="text-muted-foreground">{worker.name} - Error Loading Schedule</p>
          </div>
        </div>
        
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error loading schedule: {scheduleResult.error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const { schedule, workerName } = scheduleResult.data!

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/workers/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Worker
          </Button>
        </Link>
      </div>
      
      <ScheduleForm 
        workerId={id}
        initialSchedule={schedule}
        workerName={workerName}
      />
    </div>
  )
} 