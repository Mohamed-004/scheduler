'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  Edit, 
  Trash2, 
  Plus,
  Loader2,
  Award,
  DollarSign,
  Crown,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface JobRole {
  id: string
  name: string
  description?: string
  color_code: string
  hourly_rate_base?: number
}

interface RoleAssignment {
  id: string
  job_role_id: string
  is_lead: boolean
  hourly_rate?: number
  assigned_at: string
  job_role: JobRole
}

interface WorkerRolesManagerProps {
  workerId: string
  workerName: string
  availableRoles: JobRole[]
  currentAssignments: RoleAssignment[]
  userRole: string
}

export function WorkerRolesManager({ 
  workerId, 
  workerName,
  availableRoles,
  currentAssignments: initialAssignments,
  userRole
}: WorkerRolesManagerProps) {
  const [assignments, setAssignments] = useState<RoleAssignment[]>(initialAssignments)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  // Filter available roles that aren't already assigned
  const assignedRoleIds = assignments.map(a => a.job_role_id)
  const unassignedRoles = availableRoles.filter(role => 
    !assignedRoleIds.includes(role.id) &&
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAssignRole = async (roleId: string, hourlyRate: number, isLead: boolean) => {
    setPendingAction('assign')
    startTransition(async () => {
      try {
        const response = await fetch('/api/worker-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            worker_id: workerId,
            job_role_id: roleId,
            hourly_rate: hourlyRate,
            is_lead: isLead
          })
        })

        const result = await response.json()
        
        if (result.success) {
          // Add the new assignment to state
          const role = availableRoles.find(r => r.id === roleId)
          if (role) {
            const newAssignment: RoleAssignment = {
              id: result.data.id,
              job_role_id: roleId,
              is_lead: isLead,
              hourly_rate: hourlyRate,
              assigned_at: new Date().toISOString(),
              job_role: role
            }
            setAssignments(prev => [newAssignment, ...prev])
          }
          setShowAssignForm(false)
          setSelectedRole(null)
          toast.success('Role assigned successfully')
        } else {
          toast.error(result.error || 'Failed to assign role')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleRemoveRole = async (assignmentId: string, roleName: string) => {
    if (!confirm(`Remove ${roleName} role from ${workerName}?`)) {
      return
    }

    setPendingAction(assignmentId)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/worker-roles/${assignmentId}`, {
          method: 'DELETE'
        })

        const result = await response.json()
        
        if (result.success) {
          setAssignments(prev => prev.filter(a => a.id !== assignmentId))
          toast.success('Role removed successfully')
        } else {
          toast.error(result.error || 'Failed to remove role')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Role Assignments</CardTitle>
              <CardDescription>
                Roles currently assigned to {workerName}
              </CardDescription>
            </div>
            {!showAssignForm && (
              <Button onClick={() => setShowAssignForm(true)} disabled={unassignedRoles.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length > 0 ? (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                  style={{ borderLeftColor: assignment.job_role.color_code, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{assignment.job_role.name}</h4>
                        {assignment.is_lead && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Crown className="h-3 w-3 mr-1" />
                            Lead
                          </Badge>
                        )}
                      </div>
                      {assignment.job_role.description && (
                        <p className="text-sm text-muted-foreground">
                          {assignment.job_role.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span>${assignment.hourly_rate || assignment.job_role.hourly_rate_base || 0}/hr</span>
                        </div>
                        <span>•</span>
                        <span>Assigned {new Date(assignment.assigned_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveRole(assignment.id, assignment.job_role.name)}
                    disabled={isPending || pendingAction === assignment.id}
                  >
                    {pendingAction === assignment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No roles assigned
              </h3>
              <p className="text-muted-foreground mb-4">
                Assign job roles to track this worker's capabilities and hourly rates
              </p>
              {!showAssignForm && unassignedRoles.length > 0 && (
                <Button onClick={() => setShowAssignForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign First Role
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Role Form */}
      {showAssignForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assign New Role</CardTitle>
                <CardDescription>
                  Select a job role to assign to {workerName}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => {
                setShowAssignForm(false)
                setSelectedRole(null)
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedRole ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search available roles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {unassignedRoles.length > 0 ? (
                  <div className="space-y-2">
                    {unassignedRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                        style={{ borderLeftColor: role.color_code, borderLeftWidth: '4px' }}
                        onClick={() => setSelectedRole(role)}
                      >
                        <div>
                          <h4 className="font-medium">{role.name}</h4>
                          {role.description && (
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          )}
                          {role.hourly_rate_base && (
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                              <DollarSign className="h-3 w-3" />
                              <span>Base rate: ${role.hourly_rate_base}/hr</span>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No roles match your search' : 'All available roles have been assigned'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <RoleAssignmentForm
                role={selectedRole}
                onAssign={handleAssignRole}
                onCancel={() => setSelectedRole(null)}
                isPending={isPending && pendingAction === 'assign'}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Role Assignment Form Component
interface RoleAssignmentFormProps {
  role: JobRole
  onAssign: (roleId: string, hourlyRate: number, isLead: boolean) => void
  onCancel: () => void
  isPending: boolean
}

function RoleAssignmentForm({ role, onAssign, onCancel, isPending }: RoleAssignmentFormProps) {
  const [hourlyRate, setHourlyRate] = useState(role.hourly_rate_base || 0)
  const [isLead, setIsLead] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (hourlyRate <= 0) {
      toast.error('Hourly rate must be greater than 0')
      return
    }

    onAssign(role.id, hourlyRate, isLead)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div 
        className="p-4 border rounded-lg"
        style={{ borderLeftColor: role.color_code, borderLeftWidth: '4px' }}
      >
        <h4 className="font-medium">{role.name}</h4>
        {role.description && (
          <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hourly_rate">Hourly Rate *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="hourly_rate"
              type="number"
              min="0"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="is_lead">Role Type</Label>
          <select
            id="is_lead"
            value={isLead ? 'lead' : 'regular'}
            onChange={(e) => setIsLead(e.target.value === 'lead')}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="regular">Regular Worker</option>
            <option value="lead">Lead Worker</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-4 border-t">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Award className="h-4 w-4 mr-2" />
          )}
          Assign Role
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}