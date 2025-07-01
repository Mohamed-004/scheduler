'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Stepper, type Step } from "@/components/ui/stepper"
import { SimpleAlert, type AlertItem } from "@/components/ui/simple-alert"
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Users, Plus, User, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getMinDateString, isDateInPast } from '@/lib/date-utils'
import { intelligentScheduler, type SchedulingResult, type RoleValidationResult } from '@/lib/intelligent-scheduling'
import { WorkerSelector } from '@/components/jobs/worker-selector'
import { type JobRequirement } from '@/lib/worker-availability'
import { type AssignmentSuggestion, type JobData } from '@/lib/job-assignment'

interface Client {
  id: string
  name: string
  email: string
  phone: string
}

interface JobRole {
  id: string
  name: string
  description?: string
  hourly_rate_base?: number
  color_code: string
}

interface JobWizardProps {
  userProfile: { team_id: string; role: string }
}

export function JobWizard({ userProfile }: JobWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [clients, setClients] = useState<Client[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [validationIssues, setValidationIssues] = useState<AlertItem[]>([])
  const [schedulingResult, setSchedulingResult] = useState<SchedulingResult | null>(null)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentSuggestion | null>(null)

  // Add logging for selection changes
  const handleAssignmentSelect = (assignment: AssignmentSuggestion) => {
    console.log('🎯 JOB WIZARD: Assignment selection received:', assignment)
    console.log('🎯 JOB WIZARD: Previous selected assignment:', selectedAssignment)
    setSelectedAssignment(assignment)
    console.log('🎯 JOB WIZARD: setSelectedAssignment called with:', assignment)
  }
  const [roleValidationResult, setRoleValidationResult] = useState<RoleValidationResult | null>(null)
  const [isValidatingRoles, setIsValidatingRoles] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    job_type: '',
    address: '',
    notes: '',
    
    // Step 2: Client
    client_id: '',
    newClient: {
      name: '',
      email: '',
      phone: ''
    },
    createNewClient: false,
    
    // Step 3: Pricing
    quote_amount: '',
    remaining_balance: '',
    
    // Step 4: Schedule
    scheduled_date: '',
    start_time: '',
    end_time: '',
    
    // Step 5: Workers and Roles
    worker_count: '1',
    job_role_ids: [] as string[],
    special_requirements: ''
  })

  const steps: Step[] = [
    {
      id: 'basic',
      title: 'Job Details',
      description: 'What type of work needs to be done?'
    },
    {
      id: 'client',
      title: 'Client',
      description: 'Who is this job for?'
    },
    {
      id: 'pricing',
      title: 'Pricing',
      description: 'Project cost and payment details'
    },
    {
      id: 'schedule',
      title: 'Schedule',
      description: 'When should this job happen?'
    },
    {
      id: 'workers',
      title: 'Workers & Roles',
      description: 'Assign workers and roles'
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Confirm all details'
    }
  ]

  useEffect(() => {
    // Load clients and job roles
    const fetchData = async () => {
      const supabase = createClient()
      
      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, email, phone')
        .eq('team_id', userProfile.team_id)
        .order('name')
      setClients(clientsData || [])
      
      // Fetch job roles
      const { data: rolesData } = await supabase
        .from('job_roles')
        .select('id, name, description, hourly_rate_base, color_code')
        .eq('team_id', userProfile.team_id)
        .eq('is_active', true)
        .order('name')
      setJobRoles(rolesData || [])
    }
    fetchData()
  }, [userProfile.team_id])

  // Auto-check availability when schedule fields are complete
  useEffect(() => {
    if (formData.scheduled_date && formData.start_time && formData.end_time && formData.worker_count) {
      const timer = setTimeout(() => {
        checkSchedulingAvailability()
      }, 500) // Debounce to avoid too many calls
      
      return () => clearTimeout(timer)
    }
  }, [formData.scheduled_date, formData.start_time, formData.end_time, formData.worker_count, formData.job_role_ids])

  // Validate roles when entering Review step
  useEffect(() => {
    if (currentStep === 5) { // Review step
      validateRolesForReview()
    }
  }, [currentStep, formData.scheduled_date, formData.start_time, formData.end_time, formData.worker_count, formData.job_role_ids])

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {}
    const issues: AlertItem[] = []
    
    switch (currentStep) {
      case 0: // Basic Info
        if (!formData.job_type.trim()) {
          newErrors.job_type = 'Job type is required'
          issues.push({
            id: 'job_type',
            title: 'Missing Job Type',
            message: 'Please describe what type of work needs to be done',
            suggestions: ['Examples: Lawn Maintenance, Tree Removal, Cleaning Service']
          })
        }
        if (!formData.address.trim()) {
          newErrors.address = 'Job address is required'
          issues.push({
            id: 'address',
            title: 'Missing Job Address',
            message: 'Please provide where this work will be performed',
            suggestions: ['Enter the complete street address including city and state']
          })
        }
        break

      case 1: // Client
        if (!formData.createNewClient && !formData.client_id) {
          issues.push({
            id: 'client',
            title: 'No Client Selected',
            message: 'Please choose an existing client or create a new one',
            suggestions: ['Select a client from the list below', 'Click "Add New Client" to create one'],
            action: {
              label: 'Add New Client',
              onClick: () => setFormData(prev => ({ ...prev, createNewClient: true }))
            }
          })
        }
        if (formData.createNewClient) {
          if (!formData.newClient.name.trim()) {
            newErrors['newClient.name'] = 'Client name is required'
            issues.push({
              id: 'client_name',
              title: 'Missing Client Name',
              message: 'Please enter the client\'s name or company name'
            })
          }
          if (!formData.newClient.email.trim()) {
            newErrors['newClient.email'] = 'Client email is required'
            issues.push({
              id: 'client_email',
              title: 'Missing Client Email',
              message: 'Please provide the client\'s email address for communication'
            })
          }
        }
        break

      case 2: // Pricing
        if (!formData.quote_amount) {
          issues.push({
            id: 'quote',
            title: 'Missing Project Total',
            message: 'Please enter the total amount for this job',
            suggestions: ['Enter the full quoted amount for the entire project']
          })
        } else {
          const quoteAmount = parseFloat(formData.quote_amount)
          if (quoteAmount <= 0) {
            issues.push({
              id: 'quote_invalid',
              title: 'Invalid Project Total',
              message: 'Project total must be greater than $0'
            })
          }
        }
        
        if (!formData.remaining_balance) {
          issues.push({
            id: 'balance',
            title: 'Missing Remaining Balance',
            message: 'Please enter how much is still owed on this job',
            suggestions: ['Enter $0 if the job is fully paid', 'Enter the remaining amount if partially paid']
          })
        } else {
          const quoteAmount = parseFloat(formData.quote_amount)
          const remainingBalance = parseFloat(formData.remaining_balance)
          if (remainingBalance > quoteAmount) {
            issues.push({
              id: 'balance_invalid',
              title: 'Invalid Remaining Balance',
              message: 'Remaining balance cannot be more than the project total',
              suggestions: [`Project total: $${quoteAmount.toFixed(2)}`, 'Adjust the remaining balance to be less than or equal to the project total']
            })
          }
        }
        break

      case 3: // Schedule
        if (!formData.scheduled_date) {
          issues.push({
            id: 'date',
            title: 'Missing Job Date',
            message: 'Please select when this job should be performed'
          })
        } else {
          // Check if the selected date is in the past
          if (isDateInPast(formData.scheduled_date)) {
            issues.push({
              id: 'date_past',
              title: 'Invalid Job Date',
              message: 'Job date cannot be in the past',
              suggestions: ['Please select today or a future date']
            })
          }
          
          // If it's today, check if the selected time is in the past
          const todayString = getMinDateString()
          if (formData.scheduled_date === todayString && formData.start_time) {
            const now = new Date()
            const selectedDateTime = new Date(`${formData.scheduled_date}T${formData.start_time}:00`)
            
            // Add 30 minutes buffer for realistic scheduling
            const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)
            
            if (selectedDateTime < thirtyMinutesFromNow) {
              issues.push({
                id: 'time_past',
                title: 'Invalid Start Time',
                message: 'Start time must be at least 30 minutes from now for today\'s jobs',
                suggestions: ['Please select a time that is at least 30 minutes from now']
              })
            }
          }
        }
        
        if (!formData.start_time) {
          issues.push({
            id: 'start_time',
            title: 'Missing Start Time',
            message: 'Please specify when the job should begin'
          })
        }
        
        if (!formData.end_time) {
          issues.push({
            id: 'end_time',
            title: 'Missing End Time',
            message: 'Please specify when the job should finish'
          })
        }
        
        if (formData.start_time && formData.end_time) {
          const start = new Date(`2000-01-01T${formData.start_time}:00`)
          const end = new Date(`2000-01-01T${formData.end_time}:00`)
          if (end <= start) {
            issues.push({
              id: 'time_invalid',
              title: 'Invalid Time Range',
              message: 'End time must be after start time',
              suggestions: ['Make sure the end time is later than the start time']
            })
          }
        }
        break

      case 4: // Workers
        if (!formData.worker_count || parseInt(formData.worker_count) < 1) {
          issues.push({
            id: 'workers',
            title: 'Missing Worker Count',
            message: 'Please specify how many workers are needed for this job',
            suggestions: ['Most jobs need at least 1 worker', 'Consider the job size and complexity']
          })
        }
        if (!formData.job_role_ids || formData.job_role_ids.length === 0) {
          issues.push({
            id: 'job_role',
            title: 'Missing Job Roles',
            message: 'Please select at least one role needed for this job',
            suggestions: ['Choose the skills/roles required', 'You can select multiple roles', 'You can create new roles in the Roles section'],
            action: {
              label: 'Create Roles',
              onClick: () => window.open('/dashboard/roles', '_blank')
            }
          })
        }
        
        // Check for critical availability issues
        if (schedulingResult && schedulingResult.issues.some(issue => 
          issue.type === 'error' && ['NO_WORKERS', 'NO_WORKERS_WITH_ROLE', 'INSUFFICIENT_WORKERS'].includes(issue.code)
        )) {
          const criticalIssues = schedulingResult.issues.filter(issue => 
            issue.type === 'error' && ['NO_WORKERS', 'NO_WORKERS_WITH_ROLE', 'INSUFFICIENT_WORKERS'].includes(issue.code)
          )
          
          criticalIssues.forEach(issue => {
            issues.push({
              id: `availability_${issue.code}`,
              title: 'Worker Availability Issue',
              message: issue.message,
              suggestions: issue.suggestions,
              action: issue.actions?.[0] ? {
                label: issue.actions[0].label,
                onClick: () => {
                  if (issue.actions?.[0]?.action === 'navigate') {
                    window.open(issue.actions[0].data, '_blank')
                  }
                }
              } : undefined
            })
          })
        }
        break
    }

    setErrors(newErrors)
    setValidationIssues(issues)
    return issues.length === 0
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    // Clear validation issues
    if (validationIssues.length > 0) {
      setValidationIssues([])
    }
    // Clear scheduling result when relevant fields change
    if (['scheduled_date', 'start_time', 'end_time', 'worker_count'].includes(field)) {
      setSchedulingResult(null)
    }
  }

  const handleNestedInputChange = (parent: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev] as any,
        [field]: value
      }
    }))
  }

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      job_role_ids: prev.job_role_ids.includes(roleId)
        ? prev.job_role_ids.filter(id => id !== roleId)
        : [...prev.job_role_ids, roleId]
    }))
    // Clear validation issues when user makes changes
    if (validationIssues.length > 0) {
      setValidationIssues([])
    }
    // Clear scheduling result when roles change
    setSchedulingResult(null)
  }

  const checkSchedulingAvailability = async () => {
    if (!formData.scheduled_date || !formData.start_time || !formData.end_time || !formData.worker_count) {
      return
    }

    setIsCheckingAvailability(true)
    
    try {
      const result = await intelligentScheduler.validateJobScheduling({
        teamId: userProfile.team_id,
        scheduledDate: formData.scheduled_date,
        startTime: formData.start_time,
        endTime: formData.end_time,
        requiredWorkers: parseInt(formData.worker_count),
        requiredRoles: formData.job_role_ids.length > 0 ? formData.job_role_ids : undefined
      })
      
      setSchedulingResult(result)
    } catch (error) {
      console.error('Error checking availability:', error)
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  const validateRolesForReview = async () => {
    if (!formData.scheduled_date || !formData.start_time || !formData.end_time || !formData.worker_count) {
      return
    }


    setIsValidatingRoles(true)
    
    try {
      const result = await intelligentScheduler.validateWorkerRoleMatching({
        teamId: userProfile.team_id,
        scheduledDate: formData.scheduled_date,
        startTime: formData.start_time,
        endTime: formData.end_time,
        requiredWorkers: parseInt(formData.worker_count),
        requiredRoles: formData.job_role_ids.length > 0 ? formData.job_role_ids : undefined
      })
      
      setRoleValidationResult(result)
    } catch (error) {
      console.error('Error validating roles for review:', error)
    } finally {
      setIsValidatingRoles(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="job_type">What type of work needs to be done? *</Label>
              <Input
                id="job_type"
                value={formData.job_type}
                onChange={(e) => handleInputChange('job_type', e.target.value)}
                placeholder="e.g., Lawn Maintenance, Tree Removal, House Cleaning"
                className={`mt-2 ${errors.job_type ? 'border-red-500' : ''}`}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Be specific about the type of service being provided
              </p>
            </div>
            
            <div>
              <Label htmlFor="address">Where will this work be performed? *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Main St, City, State 12345"
                className={`mt-2 ${errors.address ? 'border-red-500' : ''}`}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Include the complete address where workers should go
              </p>
            </div>
            
            <div>
              <Label htmlFor="notes">Additional Details (Optional)</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any special instructions, access codes, or important details..."
                rows={3}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )

      case 1: // Client
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Who is this job for?</h3>
                <p className="text-sm text-muted-foreground">Select an existing client or add a new one</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  createNewClient: !prev.createNewClient,
                  client_id: prev.createNewClient ? '' : prev.client_id
                }))}
              >
                {formData.createNewClient ? 'Select Existing' : 'Add New Client'}
              </Button>
            </div>

            {!formData.createNewClient ? (
              <div>
                <Label>Select Client *</Label>
                <select
                  value={formData.client_id}
                  onChange={(e) => handleInputChange('client_id', e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No clients found. You'll need to create a new client.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
                <h4 className="font-medium">New Client Information</h4>
                
                <div>
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    value={formData.newClient.name}
                    onChange={(e) => handleNestedInputChange('newClient', 'name', e.target.value)}
                    placeholder="John Smith or ABC Company"
                    className={`mt-1 ${errors['newClient.name'] ? 'border-red-500' : ''}`}
                  />
                </div>
                
                <div>
                  <Label htmlFor="client_email">Email Address *</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={formData.newClient.email}
                    onChange={(e) => handleNestedInputChange('newClient', 'email', e.target.value)}
                    placeholder="client@example.com"
                    className={`mt-1 ${errors['newClient.email'] ? 'border-red-500' : ''}`}
                  />
                </div>
                
                <div>
                  <Label htmlFor="client_phone">Phone Number</Label>
                  <Input
                    id="client_phone"
                    value={formData.newClient.phone}
                    onChange={(e) => handleNestedInputChange('newClient', 'phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        )

      case 2: // Pricing
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">What are the financial details?</h3>
              <p className="text-sm text-muted-foreground">Set the project cost and payment information</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="quote_amount">Project Total *</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    id="quote_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quote_amount}
                    onChange={(e) => handleInputChange('quote_amount', e.target.value)}
                    placeholder="500.00"
                    className={`pl-8 focus:ring-2 focus:ring-primary/20 ${errors.quote_amount ? 'border-red-500' : ''}`}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  The total quoted amount for this entire job
                </p>
              </div>
              
              <div>
                <Label htmlFor="remaining_balance">Remaining Balance *</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    id="remaining_balance"
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.quote_amount || undefined}
                    value={formData.remaining_balance}
                    onChange={(e) => handleInputChange('remaining_balance', e.target.value)}
                    placeholder="250.00"
                    className={`pl-8 focus:ring-2 focus:ring-primary/20 ${errors.remaining_balance ? 'border-red-500' : ''}`}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Amount still owed (enter $0 if fully paid)
                </p>
              </div>
            </div>

            {formData.quote_amount && formData.remaining_balance && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-800 font-medium">Amount Paid:</span>
                  <span className="font-semibold text-green-900 text-lg">
                    ${(parseFloat(formData.quote_amount) - parseFloat(formData.remaining_balance)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )

      case 3: // Schedule
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">When should this job happen?</h3>
              <p className="text-sm text-muted-foreground">Set the date and time for this work</p>
            </div>
            
            <div>
              <Label htmlFor="scheduled_date">Job Date *</Label>
              <Input
                id="scheduled_date"
                type="date"
                min={getMinDateString()}
                value={formData.scheduled_date}
                onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                className={`mt-2 focus:ring-2 focus:ring-primary/20 ${errors.scheduled_date ? 'border-red-500' : ''}`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can select today or any future date
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="start_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start Time *
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  className={`mt-2 focus:ring-2 focus:ring-primary/20 ${errors.start_time ? 'border-red-500' : ''}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.scheduled_date === getMinDateString() 
                    ? 'Must be at least 30 minutes from now'
                    : 'When should the work begin?'
                  }
                </p>
              </div>
              
              <div>
                <Label htmlFor="end_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  End Time *
                </Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  className={`mt-2 focus:ring-2 focus:ring-primary/20 ${errors.end_time ? 'border-red-500' : ''}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When should the work be completed?
                </p>
              </div>
            </div>

            {formData.start_time && formData.end_time && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-800 font-medium">Estimated Duration:</span>
                  <span className="font-semibold text-blue-900">
                    {(() => {
                      const start = new Date(`2000-01-01T${formData.start_time}:00`)
                      const end = new Date(`2000-01-01T${formData.end_time}:00`)
                      if (end > start) {
                        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                        return hours === 1 ? '1 hour' : `${hours.toFixed(1)} hours`
                      }
                      return 'Invalid time range'
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* Worker Availability Check */}
            {formData.scheduled_date && formData.start_time && formData.end_time && formData.worker_count && (
              <div className="space-y-4">
                {isCheckingAvailability && (
                  <div className="p-4 bg-gray-50 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <span className="text-sm text-gray-600">Checking worker availability...</span>
                    </div>
                  </div>
                )}

                {!isCheckingAvailability && !schedulingResult && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={checkSchedulingAvailability}
                    className="w-full"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Check Worker Availability
                  </Button>
                )}

                {schedulingResult && (
                  <div className="space-y-3">
                    {schedulingResult.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          issue.type === 'error'
                            ? 'bg-red-50 border-red-200'
                            : issue.type === 'warning'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {issue.type === 'error' ? (
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                          ) : issue.type === 'warning' ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <h4 className={`font-medium ${
                              issue.type === 'error'
                                ? 'text-red-900'
                                : issue.type === 'warning'
                                ? 'text-yellow-900'
                                : 'text-green-900'
                            }`}>
                              {issue.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              issue.type === 'error'
                                ? 'text-red-800'
                                : issue.type === 'warning'
                                ? 'text-yellow-800'
                                : 'text-green-800'
                            }`}>
                              {issue.message}
                            </p>
                            {issue.suggestions.length > 0 && (
                              <ul className={`text-sm mt-2 space-y-1 ${
                                issue.type === 'error'
                                  ? 'text-red-700'
                                  : issue.type === 'warning'
                                  ? 'text-yellow-700'
                                  : 'text-green-700'
                              }`}>
                                {issue.suggestions.map((suggestion, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {issue.actions && issue.actions.length > 0 && (
                              <div className="mt-3 space-x-2">
                                {issue.actions.map((action, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (action.action === 'navigate') {
                                        window.open(action.data, '_blank')
                                      }
                                    }}
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}


                    {schedulingResult.suggestions.available_slots.length > 0 && (
                      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <h4 className="font-medium text-indigo-900 mb-2">Alternative Time Slots</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {schedulingResult.suggestions.available_slots.slice(0, 6).map((slot, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                const [time] = slot.split(' - ')
                                handleInputChange('start_time', time)
                              }}
                            >
                              {slot}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 4: // Workers & Roles
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Configure the team for this job</h3>
              <p className="text-sm text-muted-foreground">Specify the workers and roles needed</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="worker_count">Number of Workers *</Label>
                <select
                  id="worker_count"
                  value={formData.worker_count}
                  onChange={(e) => handleInputChange('worker_count', e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="1">1 Worker</option>
                  <option value="2">2 Workers</option>
                  <option value="3">3 Workers</option>
                  <option value="4">4 Workers</option>
                  <option value="5">5+ Workers</option>
                </select>
                <p className="text-sm text-muted-foreground mt-1">
                  Consider the job size and complexity
                </p>
              </div>
              
              <div>
                <Label htmlFor="job_roles">Required Job Roles *</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Select all roles needed for this job. You can choose multiple.
                </p>
                {jobRoles.length === 0 ? (
                  <p className="text-sm text-amber-600 mt-2">
                    No roles found. <button 
                      type="button"
                      onClick={() => window.open('/dashboard/roles', '_blank')}
                      className="underline hover:no-underline"
                    >
                      Create roles first
                    </button>
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {jobRoles.map((role) => (
                      <label
                        key={role.id}
                        className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                          formData.job_role_ids.includes(role.id)
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.job_role_ids.includes(role.id)}
                          onChange={() => handleRoleToggle(role.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary/20"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">{role.name}</span>
                              {/* Availability indicator */}
                              {schedulingResult && formData.scheduled_date && formData.start_time && formData.end_time && (
                                (() => {
                                  const roleIssue = schedulingResult.issues.find(issue => 
                                    issue.code === 'NO_WORKERS_WITH_ROLE' && issue.message.includes(role.name)
                                  )
                                  const hasWorkers = !roleIssue
                                  return (
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                      hasWorkers 
                                        ? 'bg-green-100 text-green-700 border border-green-200' 
                                        : 'bg-red-100 text-red-700 border border-red-200'
                                    }`}>
                                      {hasWorkers ? '✓ Available' : '✗ No workers'}
                                    </span>
                                  )
                                })()
                              )}
                            </div>
                            {role.hourly_rate_base && (
                              <span className="text-sm text-muted-foreground">
                                ${role.hourly_rate_base}/hr
                              </span>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="special_requirements">Special Requirements (Optional)</Label>
              <textarea
                id="special_requirements"
                value={formData.special_requirements}
                onChange={(e) => handleInputChange('special_requirements', e.target.value)}
                placeholder="Any specific skills, certifications, or equipment needed..."
                rows={3}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            {formData.job_role_ids.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">
                      {formData.job_role_ids.length === 1 ? 'Role Selected' : 'Roles Selected'}
                    </h4>
                    <div className="mt-2 space-y-1">
                      {formData.job_role_ids.map(roleId => {
                        const role = jobRoles.find(r => r.id === roleId)
                        return role ? (
                          <div key={roleId} className="flex items-center justify-between text-sm">
                            <span className="text-blue-800 font-medium">{role.name}</span>
                            {role.hourly_rate_base && (
                              <span className="text-blue-600">${role.hourly_rate_base}/hr</span>
                            )}
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Worker Availability Summary */}
            {formData.job_role_ids.length > 0 && formData.scheduled_date && formData.start_time && formData.end_time && (
              <div className="space-y-4">
                {schedulingResult ? (
                  <div className="space-y-3">
                    {/* Show key availability issues */}
                    {schedulingResult.issues.filter(issue => 
                      ['NO_WORKERS_WITH_ROLE', 'INSUFFICIENT_WORKERS', 'NO_WORKERS'].includes(issue.code)
                    ).map((issue, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          issue.type === 'error'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                            issue.type === 'error' ? 'text-red-600' : 'text-yellow-600'
                          }`} />
                          <div className="flex-1">
                            <h4 className={`font-medium ${
                              issue.type === 'error' ? 'text-red-900' : 'text-yellow-900'
                            }`}>
                              {issue.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              issue.type === 'error' ? 'text-red-800' : 'text-yellow-800'
                            }`}>
                              {issue.message}
                            </p>
                            {issue.suggestions.length > 0 && (
                              <ul className={`text-sm mt-2 space-y-1 ${
                                issue.type === 'error' ? 'text-red-700' : 'text-yellow-700'
                              }`}>
                                {issue.suggestions.slice(0, 3).map((suggestion, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Show positive availability */}
                    {schedulingResult.issues.some(issue => issue.code === 'GOOD_AVAILABILITY') && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-green-900">Workers Available</h4>
                            <p className="text-sm text-green-800 mt-1">
                              {schedulingResult.issues.find(issue => issue.code === 'GOOD_AVAILABILITY')?.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Worker Availability Check</h4>
                        <p className="text-sm text-blue-800 mt-1">
                          Complete the schedule step to see worker availability for your selected roles and time.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {formData.job_role_ids.length === 0 && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-700">Select Roles First</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Choose the job roles needed to see worker availability and get scheduling recommendations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Worker Recommendations - Only show when roles selected AND scheduling is valid */}
            {formData.job_role_ids.length > 0 && 
             formData.scheduled_date && 
             formData.start_time && 
             formData.end_time && 
             schedulingResult && 
             schedulingResult.valid && 
             !schedulingResult.issues.some(issue => issue.type === 'error') && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Recommended Worker Assignments</h4>
                  <WorkerSelector
                    jobData={{
                      start: (() => {
                        const [year, month, day] = formData.scheduled_date.split('-').map(Number)
                        const [startHour, startMinute] = formData.start_time.split(':').map(Number)
                        return new Date(year, month - 1, day, startHour, startMinute)
                      })(),
                      finish: (() => {
                        const [year, month, day] = formData.scheduled_date.split('-').map(Number)
                        const [endHour, endMinute] = formData.end_time.split(':').map(Number)
                        return new Date(year, month - 1, day, endHour, endMinute)
                      })(),
                      type: formData.job_type,
                      address: formData.address,
                      notes: formData.notes || '',
                      estimated_duration: (() => {
                        const start = new Date(`2000-01-01T${formData.start_time}:00`)
                        const end = new Date(`2000-01-01T${formData.end_time}:00`)
                        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
                        return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                      })()
                    }}
                    requirements={formData.job_role_ids.map(roleId => {
                      const role = jobRoles.find(r => r.id === roleId)
                      console.log('🔧 JOB WIZARD: Creating requirement for role:', { roleId, role })
                      return {
                        job_role_id: roleId,
                        quantity_required: 1,
                        min_proficiency_level: 1
                      } as JobRequirement
                    })}
                    teamId={userProfile.team_id}
                    onAssignmentSelect={handleAssignmentSelect}
                    selectedAssignment={selectedAssignment}
                  />
                </div>
              </div>
            )}
          </div>
        )

      case 5: // Review
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Review Job Details</h3>
              <p className="text-sm text-muted-foreground">Please confirm all information is correct</p>
            </div>
            
            <div className="space-y-6">
              {/* Job Details */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Job Details</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{formData.job_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span>{formData.address}</span>
                  </div>
                  {formData.notes && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Notes:</span>
                      <span className="text-right max-w-xs">{formData.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Client */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Client</h4>
                {formData.createNewClient ? (
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{formData.newClient.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{formData.newClient.email}</span>
                    </div>
                    {formData.newClient.phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span>{formData.newClient.phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">
                    {clients.find(c => c.id === formData.client_id)?.name || 'Unknown Client'}
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Pricing</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project Total:</span>
                    <span className="font-medium">${parseFloat(formData.quote_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining Balance:</span>
                    <span className="font-medium">${parseFloat(formData.remaining_balance).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium text-green-600">
                      ${(parseFloat(formData.quote_amount) - parseFloat(formData.remaining_balance)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Schedule</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{new Date(formData.scheduled_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span>{formData.start_time} - {formData.end_time}</span>
                  </div>
                </div>
              </div>

              {/* Workers & Roles Validation */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Worker-Role Coverage</h4>
                {isValidatingRoles ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Validating worker assignments...</p>
                  </div>
                ) : roleValidationResult ? (
                  <div className="space-y-4">
                    {/* Overall Status */}
                    <div className={`p-3 rounded-lg ${roleValidationResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                      <div className="flex items-center space-x-2">
                        {roleValidationResult.valid ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`font-medium ${roleValidationResult.valid ? 'text-green-900' : 'text-red-900'}`}>
                          {roleValidationResult.valid ? 'All roles covered with qualified, available workers' : 'Role coverage incomplete'}
                        </span>
                      </div>
                    </div>

                    {/* Role Coverage Table */}
                    {roleValidationResult.roles.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Role Coverage Status:</h5>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-3 py-2">Role</th>
                                <th className="text-left px-3 py-2">Status</th>
                                <th className="text-right px-3 py-2">Available Workers</th>
                              </tr>
                            </thead>
                            <tbody>
                              {roleValidationResult.roles.map((role, idx) => (
                                <tr key={role.roleId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-3 py-2 font-medium">{role.roleName}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center space-x-2">
                                      {role.status === 'covered' ? (
                                        <>
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                          <span className="text-green-700">Covered</span>
                                        </>
                                      ) : role.status === 'no_workers' ? (
                                        <>
                                          <AlertTriangle className="h-4 w-4 text-red-600" />
                                          <span className="text-red-700">No Workers</span>
                                        </>
                                      ) : role.status === 'insufficient' ? (
                                        <>
                                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                                          <span className="text-orange-700">Insufficient</span>
                                        </>
                                      ) : (
                                        <>
                                          <AlertTriangle className="h-4 w-4 text-red-600" />
                                          <span className="text-red-700">Unavailable</span>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {role.availableWorkers.filter(w => w.isAvailable).length} / {role.availableWorkers.length}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Worker Assignment Summary */}
                    {roleValidationResult.roles.some(role => role.availableWorkers.length > 0) && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Worker Assignments:</h5>
                        <div className="space-y-2">
                          {roleValidationResult.roles.map(role => (
                            role.availableWorkers.length > 0 && (
                              <div key={role.roleId} className="border rounded-lg p-3">
                                <div className="font-medium text-sm mb-2">{role.roleName}</div>
                                <div className="space-y-1">
                                  {role.availableWorkers.map(worker => (
                                    <div key={worker.workerId} className="flex justify-between items-center text-sm">
                                      <div className="flex items-center space-x-2">
                                        <span className={worker.isAvailable ? 'text-green-700' : 'text-red-700'}>
                                          {worker.isAvailable ? '✓' : '✗'}
                                        </span>
                                        <span>{worker.workerName}</span>
                                      </div>
                                      <span className="text-muted-foreground">
                                        ${worker.hourlyRate}/hr
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selected Worker Assignment */}
                    {selectedAssignment && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Selected Worker Assignment:</h5>
                        <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-900">
                                {selectedAssignment.type === 'crew' ? selectedAssignment.crew_name : 'Individual Assignment'}
                              </span>
                            </div>
                            <span className="text-sm text-green-700">
                              {selectedAssignment.total_score}% Match
                            </span>
                          </div>
                          <div className="space-y-2">
                            {selectedAssignment.workers.map((worker, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{worker.worker_name}</span>
                                  {worker.is_lead && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Lead</span>
                                  )}
                                  <span className="text-muted-foreground">({worker.role_name})</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-muted-foreground">${worker.suggested_rate}/hr</span>
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Score: {worker.score}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-green-300">
                            <div className="flex justify-between text-sm">
                              <span className="text-green-700">Estimated Cost:</span>
                              <span className="font-medium text-green-900">${selectedAssignment.estimated_cost.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Issues and Suggestions */}
                    {roleValidationResult.overallIssues.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Issues:</h5>
                        <div className="space-y-2">
                          {roleValidationResult.overallIssues.map((issue, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border ${
                              issue.type === 'error' ? 'bg-red-50 border-red-200' : 
                              issue.type === 'warning' ? 'bg-orange-50 border-orange-200' : 
                              'bg-blue-50 border-blue-200'
                            }`}>
                              <div className="flex items-start space-x-2">
                                <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                                  issue.type === 'error' ? 'text-red-600' : 
                                  issue.type === 'warning' ? 'text-orange-600' : 
                                  'text-blue-600'
                                }`} />
                                <div className="flex-1">
                                  <div className={`font-medium text-sm ${
                                    issue.type === 'error' ? 'text-red-900' : 
                                    issue.type === 'warning' ? 'text-orange-900' : 
                                    'text-blue-900'
                                  }`}>
                                    {issue.title}
                                  </div>
                                  <div className={`text-xs mt-1 ${
                                    issue.type === 'error' ? 'text-red-700' : 
                                    issue.type === 'warning' ? 'text-orange-700' : 
                                    'text-blue-700'
                                  }`}>
                                    {issue.message}
                                  </div>
                                  {issue.suggestions.length > 0 && (
                                    <div className="mt-2">
                                      <div className={`text-xs font-medium ${
                                        issue.type === 'error' ? 'text-red-900' : 
                                        issue.type === 'warning' ? 'text-orange-900' : 
                                        'text-blue-900'
                                      }`}>
                                        Suggestions:
                                      </div>
                                      <ul className={`text-xs mt-1 space-y-1 ${
                                        issue.type === 'error' ? 'text-red-700' : 
                                        issue.type === 'warning' ? 'text-orange-700' : 
                                        'text-blue-700'
                                      }`}>
                                        {issue.suggestions.map((suggestion, sidx) => (
                                          <li key={sidx}>• {suggestion}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Worker-role validation will appear here</p>
                  </div>
                )}
              </div>

              {/* Final Cost Breakdown - Only when fully validated */}
              {roleValidationResult?.valid && schedulingResult?.payEstimate && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3">✅ Final Cost Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold text-green-900">
                      <span>Total Cost:</span>
                      <span>${schedulingResult.payEstimate.totalCost.toFixed(2)}</span>
                    </div>
                    {schedulingResult.payEstimate.workerCosts.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-green-200">
                        {schedulingResult.payEstimate.workerCosts.map((worker, idx) => (
                          <div key={idx} className="flex justify-between text-sm text-green-800">
                            <span>{worker.workerName} (${worker.hourlyRate}/hr)</span>
                            <span>${worker.cost.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      // Create client if needed
      let clientId = formData.client_id
      if (formData.createNewClient) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            team_id: userProfile.team_id,
            name: formData.newClient.name,
            email: formData.newClient.email,
            phone: formData.newClient.phone
          })
          .select()
          .single()
          
        if (clientError) throw clientError
        clientId = newClient.id
      }
      
      // Calculate estimated hours from start/end times
      let estimatedHours = 8 // Default fallback
      if (formData.start_time && formData.end_time) {
        const start = new Date(`2000-01-01T${formData.start_time}:00`)
        const end = new Date(`2000-01-01T${formData.end_time}:00`)
        if (end > start) {
          estimatedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        }
      }

      // Timezone issue fixed - creating proper local date objects
      
      // Create timestamps in user's local timezone to avoid UTC conversion issues
      let startTimestamp = null
      let endTimestamp = null
      
      if (formData.scheduled_date && formData.start_time) {
        // Parse date and time in local timezone
        const [year, month, day] = formData.scheduled_date.split('-').map(Number)
        const [startHour, startMinute] = formData.start_time.split(':').map(Number)
        const startDate = new Date(year, month - 1, day, startHour, startMinute)
        startTimestamp = startDate.toISOString()
      }
      
      if (formData.scheduled_date && formData.end_time) {
        const [year, month, day] = formData.scheduled_date.split('-').map(Number)
        const [endHour, endMinute] = formData.end_time.split(':').map(Number)
        const endDate = new Date(year, month - 1, day, endHour, endMinute)
        endTimestamp = endDate.toISOString()
      }

      // Create job data with remaining_balance and fixed timezone handling
      const jobData = {
        team_id: userProfile.team_id,
        client_id: clientId,
        job_type: formData.job_type,
        address: formData.address,
        estimated_hours: estimatedHours,
        quote_amount: parseFloat(formData.quote_amount),
        remaining_balance: parseFloat(formData.remaining_balance),
        notes: formData.notes || null,
        equipment_required: [],
        status: 'PENDING' as const,
        // Use corrected timestamp fields
        start_time: startTimestamp,
        end_time: endTimestamp,
      }

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single()

      if (jobError) throw jobError

      // Success! Redirect to jobs page
      router.push('/dashboard/jobs')
      
    } catch (error: any) {
      console.error('Error creating job:', error)
      setValidationIssues([{
        id: 'submit_error',
        title: 'Failed to Create Job',
        message: error.message || 'An unexpected error occurred while creating the job',
        suggestions: [
          'Please try again',
          'Check your internet connection',
          'Contact support if the problem persists'
        ]
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const isLastStep = currentStep === steps.length - 1
  
  // Strict validation rules - no compromises allowed
  const canProceed = (() => {
    // Basic validation issues must be clear
    if (validationIssues.length > 0) return false
    
    // For Review step: strict worker-role validation required
    if (currentStep === 5) {
      // Must have role validation result
      if (!roleValidationResult) return false
      
      // ALL roles must be perfectly covered
      if (!roleValidationResult.valid) return false
      
      // Cannot have any error-level issues
      if (roleValidationResult.overallIssues.some(issue => issue.type === 'error')) return false
      
      // Each role must be in 'covered' status
      if (roleValidationResult.roles.some(role => role.status !== 'covered')) return false
    }
    
    return true
  })()

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Stepper */}
      <Stepper steps={steps} currentStep={currentStep} />

      {/* Main Content */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">{steps[currentStep]?.title}</CardTitle>
          <CardDescription className="text-base">{steps[currentStep]?.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Validation Issues */}
          {validationIssues.length > 0 && (
            <div className="mb-6">
              <SimpleAlert
                type="error"
                title="Please complete this step"
                description={`${validationIssues.length} ${validationIssues.length === 1 ? 'item needs' : 'items need'} your attention.`}
                items={validationIssues}
                className="border-red-200 bg-red-50/30"
              />
            </div>
          )}

          {/* Step Content */}
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex flex-col items-end space-y-2 w-full sm:w-auto order-1 sm:order-2">
              {isLastStep && !canProceed && roleValidationResult && !roleValidationResult.valid && (
                <div className="text-sm text-red-600 text-right">
                  ⚠️ Complete role coverage required to create job
                </div>
              )}
              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed || isLoading}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title={!canProceed && roleValidationResult && !roleValidationResult.valid ? 
                    'All required roles must have qualified, available workers before job creation' : ''}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      Creating Job...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Job
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="w-full sm:w-auto"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}