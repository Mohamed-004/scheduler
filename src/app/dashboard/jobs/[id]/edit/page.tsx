/**
 * Job Edit Page
 * Allows editing existing job information with validation
 */

import { notFound } from 'next/navigation'
import { getJob } from '@/app/actions/jobs'
import { JobEditForm } from '@/components/jobs/job-edit-form'

interface JobEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function JobEditPage({ params }: JobEditPageProps) {
  const { id } = await params
  const result = await getJob(id)

  if (!result.success) {
    notFound()
  }

  const { job } = result

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Job</h1>
        <p className="text-muted-foreground">
          Update job information for: {job.job_type}
        </p>
      </div>

      <JobEditForm job={job} />
    </div>
  )
} 