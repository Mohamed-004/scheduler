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
          // DEBUG: Log all the values for troubleshooting
          const todayString = getMinDateString()
          const selectedDate = formData.scheduled_date
          const dateIsInPast = isDateInPast(formData.scheduled_date)
          
          console.log('=== DATE VALIDATION DEBUG ===')
          console.log('Current time:', new Date().toISOString())
          console.log('Selected date string:', selectedDate)
          console.log('Today string from getMinDateString():', todayString)
          console.log('isDateInPast result:', dateIsInPast)
          console.log('Dates are equal:', selectedDate === todayString)
          
          // Check if the selected date is in the past
          if (dateIsInPast) {
            console.log('❌ Date validation failed - flagging as past date')
            issues.push({
              id: 'date_past',
              title: 'Invalid Job Date',
              message: 'Job date cannot be in the past',
              suggestions: ['Please select today or a future date']
            })
          } else {
            console.log('✅ Date validation passed')
          }
          
          // If it's today, check if the selected time is in the past
          if (formData.scheduled_date === todayString && formData.start_time) {
            const now = new Date()
            const selectedDateTime = new Date(`${formData.scheduled_date}T${formData.start_time}:00`)
            
            // Add 30 minutes buffer for realistic scheduling
            const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)
            
            console.log('=== TIME VALIDATION DEBUG ===')
            console.log('Current time:', now.toISOString())
            console.log('Selected datetime:', selectedDateTime.toISOString())
            console.log('30 min from now:', thirtyMinutesFromNow.toISOString())
            console.log('Time is in past:', selectedDateTime < thirtyMinutesFromNow)
            
            if (selectedDateTime < thirtyMinutesFromNow) {
              console.log('❌ Time validation failed')
              issues.push({
                id: 'time_past',
                title: 'Invalid Start Time',
                message: 'Start time must be at least 30 minutes from now for today\'s jobs',
                suggestions: ['Please select a time that is at least 30 minutes from now']
              })
            } else {
              console.log('✅ Time validation passed')
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
                            <span className="font-medium text-sm">{role.name}</span>
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

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Worker Assignment</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    The system will find suitable workers based on availability and role requirements. 
                    If no workers are available, we'll provide suggestions.
                  </p>
                </div>
              </div>
            </div>
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

              {/* Workers & Roles */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Workers & Roles</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Workers Needed:</span>
                    <span>{formData.worker_count}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Required Roles:</span>
                    {formData.job_role_ids.length > 0 ? (
                      <div className="space-y-1">
                        {formData.job_role_ids.map(roleId => {
                          const role = jobRoles.find(r => r.id === roleId)
                          return role ? (
                            <div key={roleId} className="flex justify-between text-sm">
                              <span>• {role.name}</span>
                              {role.hourly_rate_base && (
                                <span className="text-muted-foreground">${role.hourly_rate_base}/hr</span>
                              )}
                            </div>
                          ) : null
                        })}
                      </div>
                    ) : (
                      <span>None selected</span>
                    )}
                  </div>
                  {formData.special_requirements && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requirements:</span>
                      <span className="text-right max-w-xs">{formData.special_requirements}</span>
                    </div>
                  )}
                </div>
              </div>
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
      
      // Create job
      const jobData = {
        team_id: userProfile.team_id,
        client_id: clientId,
        job_type: formData.job_type,
        address: formData.address,
        quote_amount: parseFloat(formData.quote_amount),
        remaining_balance: parseFloat(formData.remaining_balance),
        scheduled_date: formData.scheduled_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes || null,
        equipment_required: [],
        status: 'PENDING' as const,
        // Legacy fields for backward compatibility
        scheduled_start: formData.scheduled_date && formData.start_time 
          ? new Date(`${formData.scheduled_date}T${formData.start_time}`).toISOString()
          : null,
        scheduled_end: formData.scheduled_date && formData.end_time 
          ? new Date(`${formData.scheduled_date}T${formData.end_time}`).toISOString()
          : null,
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
  const canProceed = validationIssues.length === 0

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
            
            <div className="flex items-center space-x-3 w-full sm:w-auto order-1 sm:order-2">
              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed || isLoading}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
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