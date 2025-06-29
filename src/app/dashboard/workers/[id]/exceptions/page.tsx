/**
 * Worker Special Exceptions Management Page
 * Handles time off, holidays, and special circumstances
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import { ExceptionForm } from '@/components/workers/exception-form'
import { getWorkerExceptions } from '@/app/actions/worker-exceptions'

interface WorkerExceptionsPageProps {
  params: {
    id: string
  }
}

export default async function WorkerExceptionsPage({ params }: WorkerExceptionsPageProps) {
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

  // Get worker's exceptions from database
  const exceptionsResult = await getWorkerExceptions(id)
  
  if (!exceptionsResult.success) {
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
            <h1 className="text-2xl font-bold">Special Exceptions</h1>
            <p className="text-muted-foreground">{worker.name} - Error Loading Exceptions</p>
          </div>
        </div>
        
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error loading exceptions: {exceptionsResult.error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const { exceptions, workerName } = exceptionsResult.data!

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
      
      <ExceptionForm 
        workerId={id}
        initialExceptions={exceptions}
        workerName={workerName}
      />
    </div>
  )
} 