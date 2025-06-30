'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Users, 
  Plus,
  Minus,
  Save,
  Loader2,
  UserCheck,
  Star,
  Phone,
  Mail,
  Award,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface Worker {
  id: string
  name: string
  phone: string
  rating: number
  is_active: boolean
  user: {
    id: string
    email: string
    role: string
  }
}

interface JobRole {
  id: string
  name: string
  description?: string
  color_code: string
  hourly_rate_base?: number
}

interface CrewFormProps {
  availableWorkers: Worker[]
  availableRoles: JobRole[]
  userRole: string
}

interface CrewData {
  name: string
  description: string
  is_active: boolean
}

interface SelectedWorker extends Worker {
  isLead?: boolean
}

interface RoleCapability {
  job_role_id: string
  capacity: number
  proficiency_level: number
}

export function CrewForm({ availableWorkers, availableRoles, userRole }: CrewFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<'details' | 'workers' | 'capabilities'>('details')
  
  // Form data
  const [crewData, setCrewData] = useState<CrewData>({
    name: '',
    description: '',
    is_active: true
  })
  
  const [selectedWorkers, setSelectedWorkers] = useState<SelectedWorker[]>([])
  const [roleCapabilities, setRoleCapabilities] = useState<RoleCapability[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter available workers based on search and already selected
  const selectedWorkerIds = selectedWorkers.map(w => w.id)
  const filteredWorkers = availableWorkers.filter(worker => 
    !selectedWorkerIds.includes(worker.id) &&
    (worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     worker.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleInputChange = (field: keyof CrewData, value: string | boolean) => {
    setCrewData(prev => ({ ...prev, [field]: value }))
  }

  const addWorker = (worker: Worker) => {
    setSelectedWorkers(prev => [...prev, { ...worker, isLead: prev.length === 0 }])
  }

  const removeWorker = (workerId: string) => {
    setSelectedWorkers(prev => {
      const updated = prev.filter(w => w.id !== workerId)
      // If we removed the lead and there are still workers, make the first one lead
      if (updated.length > 0 && !updated.some(w => w.isLead)) {
        updated[0].isLead = true
      }
      return updated
    })
  }

  const toggleLead = (workerId: string) => {
    setSelectedWorkers(prev => prev.map(worker => ({
      ...worker,
      isLead: worker.id === workerId
    })))
  }

  const addRoleCapability = () => {
    if (availableRoles.length === 0) return
    
    setRoleCapabilities(prev => [...prev, {
      job_role_id: '',
      capacity: 1,
      proficiency_level: 3
    }])
  }

  const updateRoleCapability = (index: number, field: keyof RoleCapability, value: any) => {
    setRoleCapabilities(prev => prev.map((cap, i) => 
      i === index ? { ...cap, [field]: value } : cap
    ))
  }

  const removeRoleCapability = (index: number) => {
    setRoleCapabilities(prev => prev.filter((_, i) => i !== index))
  }

  const canProceedToWorkers = () => {
    return crewData.name.trim().length >= 2
  }

  const canProceedToCapabilities = () => {
    return selectedWorkers.length >= 1
  }

  const canSubmit = () => {
    return canProceedToWorkers() && canProceedToCapabilities()
  }

  const handleSubmit = async () => {
    if (!canSubmit()) {
      toast.error('Please complete all required fields')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/crews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            crew: crewData,
            workers: selectedWorkers.map(w => ({
              worker_id: w.id,
              is_lead: w.isLead || false
            })),
            capabilities: roleCapabilities.filter(cap => cap.job_role_id)
          })
        })

        const result = await response.json()

        if (result.success) {
          toast.success('Crew created successfully!')
          router.push('/dashboard/crews')
        } else {
          toast.error(result.error || 'Failed to create crew')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      }
    })
  }

  const renderStepIndicator = () => (
    <div className="flex items-center space-x-4 mb-6">
      <div className={`flex items-center space-x-2 ${step === 'details' ? 'text-primary' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          step === 'details' ? 'bg-primary text-primary-foreground' : 
          canProceedToWorkers() ? 'bg-success text-success-foreground' : 'bg-muted'
        }`}>
          {canProceedToWorkers() && step !== 'details' ? <CheckCircle className="h-4 w-4" /> : '1'}
        </div>
        <span className="font-medium">Crew Details</span>
      </div>
      
      <div className={`w-8 h-0.5 ${canProceedToWorkers() ? 'bg-success' : 'bg-muted'}`} />
      
      <div className={`flex items-center space-x-2 ${step === 'workers' ? 'text-primary' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          step === 'workers' ? 'bg-primary text-primary-foreground' : 
          canProceedToCapabilities() ? 'bg-success text-success-foreground' : 'bg-muted'
        }`}>
          {canProceedToCapabilities() && step === 'capabilities' ? <CheckCircle className="h-4 w-4" /> : '2'}
        </div>
        <span className="font-medium">Select Workers</span>
      </div>
      
      <div className={`w-8 h-0.5 ${canProceedToCapabilities() ? 'bg-success' : 'bg-muted'}`} />
      
      <div className={`flex items-center space-x-2 ${step === 'capabilities' ? 'text-primary' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          step === 'capabilities' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          3
        </div>
        <span className="font-medium">Role Capabilities</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {renderStepIndicator()}

      {/* Step 1: Crew Details */}
      {step === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Crew Information</CardTitle>
            <CardDescription>
              Enter basic information about the crew
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Crew Name *</Label>
              <Input
                id="name"
                value={crewData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Alpha Team, Window Crew 1"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                value={crewData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the crew's specialization or purpose..."
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={crewData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="is_active">Active (available for job assignments)</Label>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <Button
                onClick={() => setStep('workers')}
                disabled={!canProceedToWorkers()}
              >
                Next: Select Workers
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Worker Selection */}
      {step === 'workers' && (
        <div className="space-y-6">
          {/* Selected Workers */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Workers ({selectedWorkers.length})</CardTitle>
              <CardDescription>
                {selectedWorkers.length === 0 
                  ? 'No workers selected yet. Add workers below.'
                  : 'Click on a worker to set them as crew lead.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedWorkers.length > 0 ? (
                <div className="space-y-3">
                  {selectedWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {worker.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{worker.name}</h4>
                            {worker.isLead && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Crew Lead
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{worker.phone}</span>
                            <span>•</span>
                            <Star className="h-3 w-3" />
                            <span>{worker.rating}/5</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLead(worker.id)}
                          disabled={worker.isLead}
                        >
                          {worker.isLead ? 'Lead' : 'Make Lead'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeWorker(worker.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select workers from the available list below
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Workers */}
          <Card>
            <CardHeader>
              <CardTitle>Available Workers</CardTitle>
              <CardDescription>
                Search and select workers to add to this crew
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workers by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {filteredWorkers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredWorkers.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {worker.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm">{worker.name}</h4>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{worker.user.email}</span>
                              <span>•</span>
                              <Star className="h-3 w-3" />
                              <span>{worker.rating}/5</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addWorker(worker)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      {availableWorkers.length === selectedWorkers.length 
                        ? 'All workers have been selected' 
                        : 'No workers match your search'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setStep('details')}
            >
              Back
            </Button>
            <Button
              onClick={() => setStep('capabilities')}
              disabled={!canProceedToCapabilities()}
            >
              Next: Role Capabilities
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Role Capabilities */}
      {step === 'capabilities' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Role Capabilities (Optional)</CardTitle>
                  <CardDescription>
                    Define what job roles this crew can handle and their capacity
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRoleCapability}
                  disabled={availableRoles.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Capability
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {roleCapabilities.length > 0 ? (
                <div className="space-y-4">
                  {roleCapabilities.map((capability, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Capability {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRoleCapability(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label>Job Role</Label>
                          <select
                            value={capability.job_role_id}
                            onChange={(e) => updateRoleCapability(index, 'job_role_id', e.target.value)}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select a role...</option>
                            {availableRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label>Capacity</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={capability.capacity}
                            onChange={(e) => updateRoleCapability(index, 'capacity', parseInt(e.target.value))}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Proficiency Level</Label>
                          <select
                            value={capability.proficiency_level}
                            onChange={(e) => updateRoleCapability(index, 'proficiency_level', parseInt(e.target.value))}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value={1}>1 - Beginner</option>
                            <option value={2}>2 - Basic</option>
                            <option value={3}>3 - Intermediate</option>
                            <option value={4}>4 - Advanced</option>
                            <option value={5}>5 - Expert</option>
                          </select>
                        </div>
                      </div>

                      {capability.job_role_id && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          {(() => {
                            const selectedRole = availableRoles.find(role => role.id === capability.job_role_id)
                            return selectedRole ? (
                              <div className="text-sm">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: selectedRole.color_code }}
                                  />
                                  <span className="font-medium">{selectedRole.name}</span>
                                </div>
                                {selectedRole.description && (
                                  <p className="text-muted-foreground">{selectedRole.description}</p>
                                )}
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No role capabilities defined</h3>
                  <p className="text-muted-foreground mb-4">
                    You can skip this step or add capabilities to help with job matching
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation and Submit */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setStep('workers')}
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit() || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Crew...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Crew
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}