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
import { getMinDateTimeString } from '@/lib/date-utils'
import { Save, ArrowLeft, AlertCircle } from 'lucide-react'

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
    quote_amount: job.quote_amount?.toString() || '',
    remaining_balance: job.remaining_balance?.toString() || '',
    scheduled_start: job.scheduled_start ? new Date(job.scheduled_start).toISOString().slice(0, 16) : '',
    scheduled_end: job.scheduled_end ? new Date(job.scheduled_end).toISOString().slice(0, 16) : '',
    notes: job.notes || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    // Real-time validation for remaining balance
    if (field === 'remaining_balance' && formData.quote_amount) {
      const quoteAmount = parseFloat(formData.quote_amount)
      const remainingBalance = parseFloat(value)
      if (remainingBalance > quoteAmount) {
        setErrors(prev => ({ ...prev, remaining_balance: 'Remaining balance cannot exceed the project total' }))
      }
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.job_type.trim()) {
      newErrors.job_type = 'Job type is required'
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Job address is required'
    }
    
    if (!formData.quote_amount) {
      newErrors.quote_amount = 'Project total is required'
    } else if (parseFloat(formData.quote_amount) <= 0) {
      newErrors.quote_amount = 'Project total must be greater than $0'
    }
    
    if (!formData.remaining_balance) {
      newErrors.remaining_balance = 'Remaining balance is required'
    } else {
      const quoteAmount = parseFloat(formData.quote_amount)
      const remainingBalance = parseFloat(formData.remaining_balance)
      if (remainingBalance > quoteAmount) {
        newErrors.remaining_balance = 'Remaining balance cannot exceed the project total'
      }
      if (remainingBalance < 0) {
        newErrors.remaining_balance = 'Remaining balance cannot be negative'
      }
    }
    
    // Date validation
    if (formData.scheduled_start) {
      const startDate = new Date(formData.scheduled_start)
      const now = new Date()
      if (startDate < now) {
        newErrors.scheduled_start = 'Start date cannot be in the past'
      }
    }
    
    if (formData.scheduled_end && formData.scheduled_start) {
      const startDate = new Date(formData.scheduled_start)
      const endDate = new Date(formData.scheduled_end)
      if (endDate <= startDate) {
        newErrors.scheduled_end = 'End date must be after start date'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!validateForm()) {
      setMessage({ 
        type: 'error', 
        text: 'Please fix the errors below and try again.' 
      })
      return
    }

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
                className={`mt-1 ${errors.job_type ? 'border-red-500' : ''}`}
              />
              {errors.job_type && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.job_type}
                </p>
              )}
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
                className={`mt-1 ${errors.address ? 'border-red-500' : ''}`}
              />
              {errors.address && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.address}
                </p>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="quote_amount">Project Total ($) *</Label>
              <Input
                id="quote_amount"
                type="number"
                step="0.01"
                min="0"
                max="999999.99"
                placeholder="500.00"
                value={formData.quote_amount}
                onChange={(e) => handleInputChange('quote_amount', e.target.value)}
                required
                className={`mt-1 ${errors.quote_amount ? 'border-red-500' : ''}`}
              />
              {errors.quote_amount && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.quote_amount}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="remaining_balance">Remaining Balance ($) *</Label>
              <Input
                id="remaining_balance"
                type="number"
                step="0.01"
                min="0"
                max={formData.quote_amount || "999999.99"}
                placeholder="250.00"
                value={formData.remaining_balance}
                onChange={(e) => handleInputChange('remaining_balance', e.target.value)}
                required
                className={`mt-1 ${errors.remaining_balance ? 'border-red-500' : ''}`}
              />
              {errors.remaining_balance && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.remaining_balance}
                </p>
              )}
              {formData.quote_amount && formData.remaining_balance && (
                <p className="text-sm text-muted-foreground mt-1">
                  Paid: ${(parseFloat(formData.quote_amount) - parseFloat(formData.remaining_balance)).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="scheduled_start">Start Date & Time</Label>
              <Input
                id="scheduled_start"
                type="datetime-local"
                min={getMinDateTimeString()}
                value={formData.scheduled_start}
                onChange={(e) => handleInputChange('scheduled_start', e.target.value)}
                className={`mt-1 ${errors.scheduled_start ? 'border-red-500' : ''}`}
              />
              {errors.scheduled_start && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.scheduled_start}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="scheduled_end">End Date & Time</Label>
              <Input
                id="scheduled_end"
                type="datetime-local"
                min={formData.scheduled_start || getMinDateTimeString()}
                value={formData.scheduled_end}
                onChange={(e) => handleInputChange('scheduled_end', e.target.value)}
                className={`mt-1 ${errors.scheduled_end ? 'border-red-500' : ''}`}
              />
              {errors.scheduled_end && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.scheduled_end}
                </p>
              )}
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