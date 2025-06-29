'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateWorkerJobStatus } from '@/app/actions/jobs'
import { Clock, Calendar, AlertTriangle, CheckCircle, Loader2, Edit, X } from 'lucide-react'
import { toast } from 'sonner'

interface WorkerJobStatusUpdaterProps {
  jobId: string
  currentStatus: string
  jobType: string
}

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled', icon: Calendar, color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: AlertTriangle, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { value: 'COMPLETED', label: 'Completed', icon: CheckCircle, color: 'bg-success/10 text-success border-success/20' },
]

export const WorkerJobStatusUpdater = ({ jobId, currentStatus, jobType }: WorkerJobStatusUpdaterProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const getCurrentStatusDisplay = () => {
    const statusOption = STATUS_OPTIONS.find(option => option.value === currentStatus)
    return statusOption || { 
      value: currentStatus, 
      label: currentStatus.toLowerCase().replace('_', ' '), 
      icon: Clock, 
      color: 'bg-muted text-muted-foreground border-border' 
    }
  }

  const handleStatusUpdate = () => {
    if (!selectedStatus || selectedStatus === currentStatus) return

    startTransition(async () => {
      try {
        const result = await updateWorkerJobStatus(jobId, selectedStatus as any, notes.trim() || undefined)
        
        if (result.error) {
          toast.error('Failed to update job status', {
            description: result.error
          })
        } else {
          toast.success('Job status updated successfully', {
            description: `Status changed to ${selectedStatus.toLowerCase().replace('_', ' ')}`
          })
          setIsModalOpen(false)
          setNotes('')
          // Refresh the page to show updated status
          window.location.reload()
        }
      } catch (error) {
        toast.error('An unexpected error occurred', {
          description: 'Please try again later'
        })
      }
    })
  }

  const currentDisplay = getCurrentStatusDisplay()
  const CurrentIcon = currentDisplay.icon

  if (!isModalOpen) {
    return (
      <div className="flex items-center space-x-2">
        {/* Current Status Badge */}
        <Badge className={`${currentDisplay.color} border flex items-center space-x-1`}>
          <CurrentIcon className="h-3 w-3" />
          <span>{currentDisplay.label}</span>
        </Badge>

        {/* Update Status Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsModalOpen(true)}
          className="h-8 flex items-center space-x-1"
        >
          <Edit className="h-3 w-3" />
          <span>Update</span>
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Status Display for when modal is open */}
      <div className="flex items-center space-x-2">
        <Badge className={`${currentDisplay.color} border flex items-center space-x-1`}>
          <CurrentIcon className="h-3 w-3" />
          <span>{currentDisplay.label}</span>
        </Badge>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsModalOpen(true)}
          className="h-8 flex items-center space-x-1"
        >
          <Edit className="h-3 w-3" />
          <span>Update</span>
        </Button>
      </div>

      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        />
        
        {/* Modal */}
        <Card className="relative w-full max-w-md mx-4 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Update Job Status</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Update the status for: <strong>{jobType}</strong>
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">New Status</Label>
                <select
                  id="status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option 
                      key={option.value} 
                      value={option.value}
                      disabled={option.value === currentStatus}
                    >
                      {option.label} {option.value === currentStatus ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Add any notes about this status update..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {isPending && (
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating job status...</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || selectedStatus === currentStatus || isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Status'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
} 