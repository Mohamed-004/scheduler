'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock,
  Plus,
  Save,
  Edit,
  Trash2,
  Plane,
  Heart,
  User,
  Gift,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  createScheduleException, 
  updateScheduleException, 
  deleteScheduleException,
  type ScheduleException 
} from '@/app/actions/worker-exceptions'
import { getMinDateString } from '@/lib/date-utils'

interface ExceptionFormProps {
  workerId: string
  initialExceptions: ScheduleException[]
  workerName: string
}

const EXCEPTION_TYPES = [
  { value: 'vacation', label: 'Vacation', icon: Plane },
  { value: 'sick', label: 'Sick Leave', icon: Heart },
  { value: 'personal', label: 'Personal', icon: User },
  { value: 'holiday', label: 'Holiday', icon: Gift },
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle }
] as const

const getExceptionIcon = (type: string) => {
  const typeConfig = EXCEPTION_TYPES.find(t => t.value === type)
  const IconComponent = typeConfig?.icon || Calendar
  return <IconComponent className="h-4 w-4" />
}

const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'approved': return 'default'
    case 'pending': return 'secondary'
    case 'rejected': return 'destructive'
    default: return 'outline'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

export function ExceptionForm({ workerId, initialExceptions, workerName }: ExceptionFormProps) {
  const [exceptions, setExceptions] = useState<ScheduleException[]>(initialExceptions)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingException, setEditingException] = useState<ScheduleException | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state for new/edit exception
  const [formData, setFormData] = useState<{
    type: 'vacation' | 'sick' | 'personal' | 'holiday' | 'emergency'
    title: string
    startDate: string
    endDate: string
    isFullDay: boolean
    startTime: string
    endTime: string
    status: 'pending' | 'approved' | 'rejected'
    notes: string
  }>({
    type: 'vacation',
    title: '',
    startDate: '',
    endDate: '',
    isFullDay: true,
    startTime: '09:00',
    endTime: '17:00',
    status: 'pending',
    notes: ''
  })

  const resetForm = () => {
    setFormData({
      type: 'vacation',
      title: '',
      startDate: '',
      endDate: '',
      isFullDay: true,
      startTime: '09:00',
      endTime: '17:00',
      status: 'pending',
      notes: ''
    })
    setShowAddForm(false)
    setEditingException(null)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    } else {
      const startDate = new Date(formData.startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (startDate < today) {
        newErrors.startDate = 'Start date cannot be in the past'
      }
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    } else if (formData.startDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      if (endDate < startDate) {
        newErrors.endDate = 'End date must be after start date'
      }
    }
    
    if (!formData.isFullDay) {
      if (formData.startTime && formData.endTime) {
        const start = new Date(`2000-01-01T${formData.startTime}:00`)
        const end = new Date(`2000-01-01T${formData.endTime}:00`)
        if (end <= start) {
          newErrors.endTime = 'End time must be after start time'
        }
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreate = () => {
    if (!validateForm()) {
      toast.error('Please fix the errors and try again')
      return
    }

    startTransition(async () => {
      try {
        const result = await createScheduleException(workerId, formData)
        if (result.success) {
          toast.success('Exception created successfully!')
          // Refresh the page to show updated data
          window.location.reload()
        } else {
          toast.error(result.error || 'Failed to create exception')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      }
    })
  }

  const handleUpdate = () => {
    if (!editingException) {
      return
    }
    
    if (!validateForm()) {
      toast.error('Please fix the errors and try again')
      return
    }

    startTransition(async () => {
      try {
        const result = await updateScheduleException(workerId, editingException.id, formData)
        if (result.success) {
          toast.success('Exception updated successfully!')
          // Update local state
          setExceptions(prev => prev.map(ex => 
            ex.id === editingException.id ? { ...ex, ...formData } : ex
          ))
          resetForm()
        } else {
          toast.error(result.error || 'Failed to update exception')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      }
    })
  }

  const handleDelete = (exceptionId: string) => {
    setDeletingId(exceptionId)
    startTransition(async () => {
      try {
        const result = await deleteScheduleException(workerId, exceptionId)
        if (result.success) {
          toast.success('Exception deleted successfully!')
          setExceptions(prev => prev.filter(ex => ex.id !== exceptionId))
        } else {
          toast.error(result.error || 'Failed to delete exception')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      } finally {
        setDeletingId(null)
      }
    })
  }

  const handleEdit = (exception: ScheduleException) => {
    setFormData({
      type: exception.type,
      title: exception.title,
      startDate: exception.startDate,
      endDate: exception.endDate,
      isFullDay: exception.isFullDay,
      startTime: exception.startTime || '09:00',
      endTime: exception.endTime || '17:00',
      status: exception.status,
      notes: exception.notes || ''
    })
    setEditingException(exception)
    setShowAddForm(true)
  }

  // Calculate summary statistics
  const summary = {
    approved: exceptions.filter(ex => ex.status === 'approved').length,
    pending: exceptions.filter(ex => ex.status === 'pending').length,
    vacation: exceptions.filter(ex => ex.type === 'vacation').length,
    sick: exceptions.filter(ex => ex.type === 'sick').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Special Exceptions</h1>
          <p className="text-muted-foreground">{workerName} - Time Off & Holidays</p>
        </div>
        
        <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Exception
        </Button>
      </div>

      {/* Add/Edit Exception Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editingException ? 'Edit Exception' : 'Add New Exception'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exception-type">Exception Type</Label>
                <select 
                  id="exception-type" 
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {EXCEPTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exception-title">Title *</Label>
                <Input
                  id="exception-title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, title: e.target.value }))
                    if (errors.title) setErrors(prev => ({ ...prev, title: '' }))
                  }}
                  placeholder="e.g., Summer Vacation"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {errors.title}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  min={getMinDateString()}
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, startDate: e.target.value }))
                    if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }))
                  }}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {errors.startDate}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  min={formData.startDate || getMinDateString()}
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, endDate: e.target.value }))
                    if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }))
                  }}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="full-day" 
                  checked={formData.isFullDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFullDay: e.target.checked }))}
                  className="rounded" 
                />
                <Label htmlFor="full-day">Full day exception</Label>
              </div>
            </div>
            
            {!formData.isFullDay && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, startTime: e.target.value }))
                      if (errors.startTime) setErrors(prev => ({ ...prev, startTime: '' }))
                    }}
                    className={errors.startTime ? 'border-red-500' : ''}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-red-600 mt-1 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.startTime}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, endTime: e.target.value }))
                      if (errors.endTime) setErrors(prev => ({ ...prev, endTime: '' }))
                    }}
                    className={errors.endTime ? 'border-red-500' : ''}
                  />
                  {errors.endTime && (
                    <p className="text-sm text-red-600 mt-1 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.endTime}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Additional details or reason for exception..."
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button onClick={editingException ? handleUpdate : handleCreate} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingException ? 'Update Exception' : 'Save Exception'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Exceptions */}
      <Card>
        <CardHeader>
          <CardTitle>Current & Upcoming Exceptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exceptions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No exceptions found</p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Exception
                </Button>
              </div>
            ) : (
              exceptions.map((exception) => (
                <div key={exception.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-muted rounded-lg">
                      {getExceptionIcon(exception.type)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{exception.title}</h3>
                        <Badge variant={getStatusColor(exception.status)}>
                          {exception.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {exception.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(exception.startDate)}
                            {exception.endDate !== exception.startDate && 
                              ` - ${formatDate(exception.endDate)}`
                            }
                          </span>
                        </div>
                        
                        {!exception.isFullDay && exception.startTime && exception.endTime && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{exception.startTime} - {exception.endTime}</span>
                          </div>
                        )}
                        
                        <Badge variant="outline">
                          {exception.isFullDay ? 'Full Day' : 'Partial Day'}
                        </Badge>
                      </div>
                      
                      {exception.notes && (
                        <p className="text-sm text-muted-foreground">{exception.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(exception)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(exception.id)}
                      disabled={deletingId === exception.id}
                    >
                      {deletingId === exception.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exception Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Exception Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.approved}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{summary.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.vacation}</div>
              <div className="text-sm text-muted-foreground">Vacation Days</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summary.sick}</div>
              <div className="text-sm text-muted-foreground">Sick Days</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}