'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, Plus, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateWorkerSchedule, type WeeklySchedule, type DaySchedule } from '@/app/actions/worker-schedule'
import { getScheduleTemplate } from '@/lib/schedule-utils'

interface ScheduleFormProps {
  workerId: string
  initialSchedule: WeeklySchedule
  workerName: string
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export function ScheduleForm({ workerId, initialSchedule, workerName }: ScheduleFormProps) {
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule)
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Calculate total weekly hours
  const totalWeeklyHours = React.useMemo(() => {
    return DAYS.reduce((total, day) => {
      const daySchedule = schedule[day]
      if (daySchedule.available && daySchedule.start && daySchedule.end) {
        const startTime = new Date(`2000-01-01T${daySchedule.start}:00`)
        const endTime = new Date(`2000-01-01T${daySchedule.end}:00`)
        const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        const breakHours = (daySchedule.break || 0) / 60
        return total + Math.max(0, workHours - breakHours)
      }
      return total
    }, 0)
  }, [schedule])

  const workingDays = DAYS.filter(day => schedule[day].available).length

  // Check if schedule has changed from initial
  const hasChanges = React.useMemo(() => {
    return JSON.stringify(schedule) !== JSON.stringify(initialSchedule)
  }, [schedule, initialSchedule])

  // Update hasUnsavedChanges when schedule changes
  React.useEffect(() => {
    setHasUnsavedChanges(hasChanges)
  }, [hasChanges])

  // Add beforeunload warning for unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const updateDaySchedule = (day: keyof WeeklySchedule, updates: Partial<DaySchedule>) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], ...updates }
    }))
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateWorkerSchedule(workerId, schedule)
        if (result.success) {
          toast.success('Schedule updated successfully!')
          setHasUnsavedChanges(false)
        } else {
          toast.error(result.error || 'Failed to update schedule')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      }
    })
  }

  const handleTemplateApply = (template: 'fulltime' | 'parttime' | 'weekend' | 'flexible') => {
    // Get template schedule from local utility instead of server action
    const templateSchedule = getScheduleTemplate(template)
    
    // Apply template to local state (no server call)
    setSchedule(templateSchedule)
    toast.success(`${template.charAt(0).toUpperCase() + template.slice(1)} template applied! Click "Save Changes" to persist.`)
  }

  const handleRevertChanges = () => {
    setSchedule(initialSchedule)
    toast.success('Changes reverted to last saved state')
  }

  const calculateNetHours = (daySchedule: DaySchedule) => {
    if (!daySchedule.available || !daySchedule.start || !daySchedule.end) return 0
    
    const startTime = new Date(`2000-01-01T${daySchedule.start}:00`)
    const endTime = new Date(`2000-01-01T${daySchedule.end}:00`)
    const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
    const breakHours = (daySchedule.break || 0) / 60
    return Math.max(0, workHours - breakHours)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule Management</h1>
          <div className="flex items-center space-x-2">
            <p className="text-muted-foreground">{workerName} - Weekly Schedule</p>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-orange-600 bg-orange-50 border-orange-200">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <Button 
              variant="outline" 
              onClick={handleRevertChanges}
              disabled={isPending}
            >
              Revert Changes
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isPending || !hasUnsavedChanges}
            variant={hasUnsavedChanges ? "default" : "outline"}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
          </Button>
        </div>
      </div>

      {/* Schedule Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTemplateApply('fulltime')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Full Time (40h)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleTemplateApply('parttime')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Part Time (20h)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleTemplateApply('weekend')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Weekend Only
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleTemplateApply('flexible')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Flexible
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS.map((day, index) => {
              const daySchedule = schedule[day]
              const netHours = calculateNetHours(daySchedule)
              
              return (
                <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-24">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={daySchedule.available}
                        onChange={(e) => updateDaySchedule(day, { available: e.target.checked })}
                        className="rounded"
                      />
                      <Label className="capitalize font-medium">{DAY_LABELS[index]}</Label>
                    </div>
                  </div>
                  
                  {daySchedule.available ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`${day}-start`} className="text-sm">Start:</Label>
                        <Input
                          id={`${day}-start`}
                          type="time"
                          value={daySchedule.start}
                          onChange={(e) => updateDaySchedule(day, { start: e.target.value })}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`${day}-end`} className="text-sm">End:</Label>
                        <Input
                          id={`${day}-end`}
                          type="time"
                          value={daySchedule.end}
                          onChange={(e) => updateDaySchedule(day, { end: e.target.value })}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`${day}-break`} className="text-sm">Break (min):</Label>
                        <Input
                          id={`${day}-break`}
                          type="number"
                          value={daySchedule.break || 0}
                          onChange={(e) => updateDaySchedule(day, { break: parseInt(e.target.value) || 0 })}
                          className="w-24"
                          min="0"
                          max="480"
                          step="15"
                        />
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {netHours > 0 ? `${netHours}h net` : '0h'}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Day off</div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalWeeklyHours.toFixed(1)}h</div>
              <div className="text-sm text-muted-foreground">Total Weekly Hours</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{workingDays}</div>
              <div className="text-sm text-muted-foreground">Working Days</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {workingDays > 0 ? (totalWeeklyHours / workingDays).toFixed(1) : '0'}h
              </div>
              <div className="text-sm text-muted-foreground">Avg. Daily Hours</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}