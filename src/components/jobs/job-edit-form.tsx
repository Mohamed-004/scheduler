/**
 * Job Edit Form Component
 * Reusable form for editing job information
 */

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateJob } from '@/app/actions/jobs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, ArrowLeft } from 'lucide-react'

interface JobEditFormProps {
  job: any // We'll type this properly later
}

export const JobEditForm = ({ job }: JobEditFormProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    client_id: job.client_id || '',
    crew_id: job.crew_id || '',
    job_type: job.job_type || '',
    address: job.address || '',
    estimated_hours: job.estimated_hours?.toString() || '',
    quote_amount: job.quote_amount?.toString() || '',
    start: job.start ? new Date(job.start).toISOString().slice(0, 16) : '',
    finish: job.finish ? new Date(job.finish).toISOString().slice(0, 16) : '',
    notes: job.notes || ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const formDataObj = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      if (value) formDataObj.append(key, value)
    })

    startTransition(async () => {
      try {
        const result = await updateJob(job.id, formDataObj)
        
        if (result.success) {
          setMessage({ type: 'success', text: 'Job updated successfully!' })
          setTimeout(() => {
            router.push(`/dashboard/jobs/${job.id}`)
          }, 1500)
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to update job' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'An unexpected error occurred' })
      }
    })
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Edit Job Information</CardTitle>
            <CardDescription>
              Update the job details below
            </CardDescription>
          </div>
          <Link href={`/dashboard/jobs/${job.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Type and Address */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="job_type">Job Type *</Label>
              <Input
                id="job_type"
                type="text"
                placeholder="e.g., Lawn Maintenance, Tree Removal"
                value={formData.job_type}
                onChange={(e) => handleInputChange('job_type', e.target.value)}
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="address">Job Address *</Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St, City, State"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          {/* Hours and Quote */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="estimated_hours">Estimated Hours *</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                min="0"
                placeholder="8.0"
                value={formData.estimated_hours}
                onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="quote_amount">Quote Amount ($) *</Label>
              <Input
                id="quote_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="500.00"
                value={formData.quote_amount}
                onChange={(e) => handleInputChange('quote_amount', e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="start">Start Date & Time</Label>
              <Input
                id="start"
                type="datetime-local"
                value={formData.start}
                onChange={(e) => handleInputChange('start', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="finish">End Date & Time</Label>
              <Input
                id="finish"
                type="datetime-local"
                value={formData.finish}
                onChange={(e) => handleInputChange('finish', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <textarea
              id="notes"
              rows={4}
              placeholder="Special instructions, requirements, or notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center space-x-4">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                  Updating Job...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Job
                </>
              )}
            </Button>
            
            <Link href={`/dashboard/jobs/${job.id}`}>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 