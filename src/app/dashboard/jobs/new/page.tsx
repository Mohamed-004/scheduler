'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, MapPin, DollarSign, Clock, Save, Users, Plus, X, UserCheck, Zap, AlertTriangle, CheckCircle, User } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getJobRoles, type JobRole } from '@/app/actions/job-roles'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
}

interface Crew {
  id: string
  name: string
  description: string
  is_active: boolean
}

interface JobRoleRequirement {
  job_role_id: string
  quantity_required: number
}

interface NewClientData {
  name: string
  email: string
  phone: string
  address: string
}

export default function NewJobPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isCheckingRole, setIsCheckingRole] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [roleRequirements, setRoleRequirements] = useState<JobRoleRequirement[]>([])
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientData, setNewClientData] = useState<NewClientData>({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [crewValidation, setCrewValidation] = useState<{
    needsCrew: boolean
    hasAvailableCrews: boolean
    totalWorkers: number
  }>({ needsCrew: false, hasAvailableCrews: false, totalWorkers: 0 })
  
  const [formData, setFormData] = useState({
    client_id: '',
    crew_id: '',
    job_type: '',
    address: '',
    estimated_hours: '',
    quote_amount: '',
    start: '',
    finish: '',
    notes: '',
    equipment_required: [] as string[]
  })

  // Role check and redirect
  useEffect(() => {
    const checkUserRole = async () => {
      const supabase = createClient()
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/auth/signin')
          return
        }

        const { data: userProfile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!userProfile) {
          router.push('/dashboard')
          return
        }

        // Only admin and sales can create jobs
        if (!['admin', 'sales'].includes(userProfile.role)) {
          router.push('/dashboard/jobs')
          return
        }

        setUserRole(userProfile.role)
        setIsCheckingRole(false)
      } catch (error) {
        router.push('/dashboard')
      }
    }
    
    checkUserRole()
  }, [router])

  useEffect(() => {
    if (!userRole || isCheckingRole) return
    
    const fetchData = async () => {
      const supabase = createClient()
      
      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name')
      
      // Fetch active crews
      const { data: crewsData } = await supabase
        .from('crews')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      // Fetch job roles
      const rolesResult = await getJobRoles()
      const rolesData = rolesResult.success ? rolesResult.data?.filter(role => role.is_active) || [] : []
      
      setClients(clientsData || [])
      setCrews(crewsData || [])
      setJobRoles(rolesData)
    }
    
    fetchData()
  }, [userRole, isCheckingRole])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Calculate crew validation whenever role requirements change
  useEffect(() => {
    const totalWorkers = roleRequirements.reduce((sum, req) => sum + req.quantity_required, 0)
    const needsCrew = totalWorkers >= 2
    const hasAvailableCrews = crews.length > 0
    
    setCrewValidation({
      needsCrew,
      hasAvailableCrews,
      totalWorkers
    })
  }, [roleRequirements, crews])

  const addRoleRequirement = () => {
    if (jobRoles.length === 0) return
    
    setRoleRequirements(prev => [...prev, {
      job_role_id: '',
      quantity_required: 1
    }])
  }

  const updateRoleRequirement = (index: number, field: keyof JobRoleRequirement, value: any) => {
    setRoleRequirements(prev => prev.map((req, i) => 
      i === index ? { ...req, [field]: value } : req
    ))
  }

  const removeRoleRequirement = (index: number) => {
    setRoleRequirements(prev => prev.filter((_, i) => i !== index))
  }

  const handleNewClientChange = (field: keyof NewClientData, value: string) => {
    setNewClientData(prev => ({ ...prev, [field]: value }))
  }

  const createNewClient = async () => {
    try {
      const supabase = createClient()
      
      // Validate required fields
      if (!newClientData.name || !newClientData.email) {
        setMessage({ type: 'error', text: 'Client name and email are required' })
        return false
      }

      const { data: client, error } = await supabase
        .from('clients')
        .insert([newClientData])
        .select()
        .single()

      if (error) throw error

      // Add to clients list and select it
      setClients(prev => [client, ...prev])
      setFormData(prev => ({ ...prev, client_id: client.id }))
      setShowNewClientForm(false)
      setNewClientData({ name: '', email: '', phone: '', address: '' })
      
      return true
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create client' })
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      
      // Validate role requirements
      if (roleRequirements.length === 0) {
        setMessage({ type: 'error', text: 'Please add at least one role requirement.' })
        setIsLoading(false)
        return
      }

      // Validate role requirements data
      for (const req of roleRequirements) {
        if (!req.job_role_id) {
          setMessage({ type: 'error', text: 'Please select a role for all requirements.' })
          setIsLoading(false)
          return
        }
      }
      
      // Prepare job data
      const jobData = {
        client_id: formData.client_id,
        crew_id: crewValidation.needsCrew && crewValidation.hasAvailableCrews ? formData.crew_id || null : null,
        job_type: formData.job_type,
        address: formData.address,
        estimated_hours: parseFloat(formData.estimated_hours),
        quote_amount: parseFloat(formData.quote_amount),
        start: formData.start ? new Date(formData.start).toISOString() : null,
        finish: formData.finish ? new Date(formData.finish).toISOString() : null,
        notes: formData.notes || null,
        equipment_required: formData.equipment_required,
        status: 'PENDING' as const
      }

      // Create the job
      const { data: createdJob, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single()

      if (jobError) throw jobError

      // Create role requirements
      if (roleRequirements.length > 0) {
        const roleRequirementsData = roleRequirements.map(req => ({
          job_id: createdJob.id,
          job_role_id: req.job_role_id,
          quantity_required: req.quantity_required,
          min_proficiency_level: 1, // Default proficiency level
          is_lead_role: false, // Default not lead role
          hourly_rate_override: null
        }))

        const { error: roleError } = await supabase
          .from('job_role_requirements')
          .insert(roleRequirementsData)

        if (roleError) {
          console.error('Error creating role requirements:', roleError)
          setMessage({ 
            type: 'success', 
            text: 'Job created successfully, but there was an issue with role requirements. You can edit them later.' 
          })
        } else {
          const workerText = crewValidation.totalWorkers === 1 ? 'worker' : 'workers'
          setMessage({ 
            type: 'success', 
            text: `Job created successfully requiring ${crewValidation.totalWorkers} ${workerText}!` 
          })
        }
      } else {
        setMessage({ type: 'success', text: 'Job created successfully!' })
      }
      
      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard/jobs')
      }, 2000)
      
    } catch (error: any) {
      console.error('Error creating job:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to create job. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking role
  if (isCheckingRole) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="text-muted-foreground">Checking permissions...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/jobs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Create New Job
          </h2>
          <p className="text-muted-foreground">
            Add a new work order to the system
          </p>
        </div>
      </div>

      {/* Job Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Job Details
          </CardTitle>
          <CardDescription>
            Enter the job information and assignment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Client *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewClientForm(!showNewClientForm)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showNewClientForm ? 'Cancel' : 'Add New Client'}
                </Button>
              </div>

              {showNewClientForm ? (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="new_client_name">Client Name *</Label>
                        <Input
                          id="new_client_name"
                          value={newClientData.name}
                          onChange={(e) => handleNewClientChange('name', e.target.value)}
                          placeholder="Company or person name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_client_email">Email *</Label>
                        <Input
                          id="new_client_email"
                          type="email"
                          value={newClientData.email}
                          onChange={(e) => handleNewClientChange('email', e.target.value)}
                          placeholder="client@example.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="new_client_phone">Phone</Label>
                        <Input
                          id="new_client_phone"
                          value={newClientData.phone}
                          onChange={(e) => handleNewClientChange('phone', e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_client_address">Address</Label>
                        <Input
                          id="new_client_address"
                          value={newClientData.address}
                          onChange={(e) => handleNewClientChange('address', e.target.value)}
                          placeholder="123 Main St, City, State"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={createNewClient}
                        disabled={!newClientData.name || !newClientData.email}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Create & Select Client
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewClientForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <select
                  id="client_id"
                  value={formData.client_id}
                  onChange={(e) => handleInputChange('client_id', e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Job Role Requirements */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Job Roles & Workers Needed *</Label>
                  <p className="text-sm text-muted-foreground">
                    Select roles and how many workers you need for each
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRoleRequirement}
                  disabled={jobRoles.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              </div>

              {jobRoles.length === 0 && (
                <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">No Job Roles Available</span>
                  </div>
                  <p className="text-sm text-orange-800">
                    You need to <Link href="/dashboard/roles" className="font-medium underline">create job roles</Link> first before you can assign workers to jobs.
                  </p>
                </div>
              )}

              {roleRequirements.map((requirement, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Role {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRoleRequirement(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <Label>Job Role *</Label>
                      <select
                        value={requirement.job_role_id}
                        onChange={(e) => updateRoleRequirement(index, 'job_role_id', e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        <option value="">Select a role...</option>
                        {jobRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Workers Needed</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={requirement.quantity_required}
                        onChange={(e) => updateRoleRequirement(index, 'quantity_required', parseInt(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {requirement.job_role_id && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      {(() => {
                        const selectedRole = jobRoles.find(role => role.id === requirement.job_role_id)
                        return selectedRole ? (
                          <div className="text-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: selectedRole.color_code }}
                              />
                              <span className="font-medium">{selectedRole.name}</span>
                              {selectedRole.hourly_rate_base && (
                                <Badge variant="outline" className="text-xs">
                                  ${selectedRole.hourly_rate_base}/hr base
                                </Badge>
                              )}
                            </div>
                            {selectedRole.description && (
                              <p className="text-muted-foreground mb-2">{selectedRole.description}</p>
                            )}
                            {selectedRole.required_certifications && selectedRole.required_certifications.length > 0 && (
                              <div>
                                <span className="text-xs font-medium">Required Certifications: </span>
                                <span className="text-xs">{selectedRole.required_certifications.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
              ))}

              {/* Crew Validation & Recommendations */}
              {crewValidation.totalWorkers > 0 && (
                <div className="space-y-3">
                  {crewValidation.needsCrew ? (
                    crewValidation.hasAvailableCrews ? (
                      <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Crew Assignment Recommended
                          </span>
                        </div>
                        <p className="text-xs text-green-700 mb-3">
                          You need {crewValidation.totalWorkers} workers. You can assign an existing crew or let the system find individual workers.
                        </p>
                        <div>
                          <Label htmlFor="crew_id">Assign to Crew (Optional)</Label>
                          <select
                            id="crew_id"
                            value={formData.crew_id}
                            onChange={(e) => handleInputChange('crew_id', e.target.value)}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Let system find individual workers...</option>
                            {crews.map((crew) => (
                              <option key={crew.id} value={crew.id}>
                                {crew.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">
                            No Crews Available for {crewValidation.totalWorkers} Workers
                          </span>
                        </div>
                        <p className="text-xs text-orange-700 mb-3">
                          You need {crewValidation.totalWorkers} workers but have no crews set up. The system will find individual workers, or you can create a crew first.
                        </p>
                        <Link href="/dashboard/crews/new">
                          <Button size="sm" variant="outline">
                            <Users className="h-4 w-4 mr-2" />
                            Create a Crew
                          </Button>
                        </Link>
                      </div>
                    )
                  ) : (
                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Individual Worker Assignment
                        </span>
                      </div>
                      <p className="text-xs text-blue-700">
                        Need {crewValidation.totalWorkers} worker. The system will find the best qualified individual worker for this job.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                  ? 'bg-success/10 text-success border border-success/20' 
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}>
                {message.text}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center space-x-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Creating Job...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Job
                  </>
                )}
              </Button>
              
              <Link href="/dashboard/jobs">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need to add a client first?</CardTitle>
            <CardDescription>
              Create a new client profile before creating this job
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/clients/new">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Add New Client
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need a new crew?</CardTitle>
            <CardDescription>
              Set up a crew before assigning this job
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/crews/new">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Create New Crew
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 