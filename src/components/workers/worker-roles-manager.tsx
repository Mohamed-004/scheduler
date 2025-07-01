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
  Crown,
  X,
  Save,
  RotateCcw,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Textarea } from '@/components/ui/textarea'

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
  proficiency_level?: number
  notes?: string
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
  
  // Edit state management
  const [editingRoles, setEditingRoles] = useState<{[id: string]: {
    is_lead: boolean
    proficiency_level: number
    notes: string
    original: RoleAssignment
  }}>({})
  
  // Confirmation dialog
  const { openDialog, DialogComponent } = useConfirmationDialog()
  
  

  // Filter available roles that aren't already assigned
  const assignedRoleIds = assignments.map(a => a.job_role_id)
  const unassignedRoles = availableRoles.filter(role => 
    !assignedRoleIds.includes(role.id) &&
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAssignRole = async (roleId: string, isLead: boolean, proficiencyLevel: number = 1) => {
    setPendingAction('assign')
    startTransition(async () => {
      try {
        const response = await fetch('/api/worker-capabilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            worker_id: workerId,
            job_role_id: roleId,
            is_lead: isLead,
            proficiency_level: proficiencyLevel
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
              proficiency_level: proficiencyLevel,
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

  const handleRemoveRole = (assignment: RoleAssignment) => {
    openDialog({
      title: 'Remove Role Assignment',
      description: `Remove ${assignment.job_role.name}${assignment.proficiency_level ? ` (Level ${assignment.proficiency_level})` : ''} from ${workerName}? This action cannot be undone.`,
      confirmText: 'Remove Role',
      variant: 'destructive',
      onConfirm: async () => {
        console.log('🗑️ Starting delete for assignment:', assignment.id)
        setPendingAction(assignment.id)
        try {
          const url = `/api/worker-capabilities/${assignment.id}`
          console.log('🌐 Making DELETE request to:', url)
          
          const response = await fetch(url, {
            method: 'DELETE'
          })
          
          console.log('📡 Delete response:', { 
            status: response.status, 
            statusText: response.statusText,
            ok: response.ok,
            url: response.url
          })

          if (!response.ok) {
            // Try to get error details from response
            let errorText = `HTTP ${response.status}`
            try {
              const errorData = await response.json()
              console.log('📦 Error response data:', errorData)
              errorText = errorData.error || errorData.message || errorText
            } catch (e) {
              console.log('📦 Could not parse error response as JSON')
              errorText = await response.text() || errorText
            }
            throw new Error(`${response.status}: ${errorText}`)
          }

          const result = await response.json()
          console.log('📦 Delete response data:', result)
          
          if (result.success) {
            setAssignments(prev => prev.filter(a => a.id !== assignment.id))
            // Remove from edit state if it was being edited
            setEditingRoles(prev => {
              const newState = { ...prev }
              delete newState[assignment.id]
              return newState
            })
            toast.success('Role removed successfully')
          } else {
            toast.error(result.error || 'Failed to remove role')
          }
        } catch (error) {
          console.error('Delete error:', error)
          if (error instanceof Error) {
            if (error.message.includes('404')) {
              toast.error('Role assignment not found - it may have already been deleted')
            } else if (error.message.includes('403')) {
              toast.error('Permission denied - you cannot delete this role assignment')
            } else if (error.message.includes('500')) {
              toast.error('Database error - please try again or contact support')
            } else {
              toast.error(`Delete failed: ${error.message}`)
            }
          } else {
            toast.error('An unexpected error occurred while deleting role')
          }
        } finally {
          setPendingAction(null)
        }
      }
    })
  }

  const handleEditRole = (assignment: RoleAssignment) => {
    console.log('✏️ Starting edit for assignment:', assignment)
    const editData = {
      is_lead: assignment.is_lead,
      proficiency_level: assignment.proficiency_level || 1,
      notes: assignment.notes || '',
      original: assignment
    }
    console.log('📝 Edit data prepared:', editData)
    
    setEditingRoles(prev => {
      const updated = {
        ...prev,
        [assignment.id]: editData
      }
      console.log('🔄 Updated editing roles state:', updated)
      return updated
    })
  }

  const handleSaveEdit = (assignmentId: string) => {
    const editData = editingRoles[assignmentId]
    if (!editData) {
      toast.error('No edit data found')
      return
    }

    console.log('🔄 Starting save edit:', { assignmentId, editData })
    setPendingAction(assignmentId)
    
    startTransition(async () => {
      try {
        const url = `/api/worker-capabilities/${assignmentId}`
        const payload = {
          is_lead: editData.is_lead,
          proficiency_level: editData.proficiency_level,
          notes: editData.notes
        }
        
        console.log('🌐 Making PUT request:', { url, payload })
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        console.log('📡 Response received:', { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok,
          url: response.url
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.log('📦 PUT Error response text:', errorText)
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
        }
        
        const result = await response.json()
        console.log('📦 Response data:', result)
        
        if (result.success) {
          // Update the assignment in state
          setAssignments(prev => prev.map(a => 
            a.id === assignmentId 
              ? { 
                  ...a, 
                  is_lead: editData.is_lead, 
                  proficiency_level: editData.proficiency_level,
                  notes: editData.notes
                }
              : a
          ))
          // Remove from edit state
          setEditingRoles(prev => {
            const newState = { ...prev }
            delete newState[assignmentId]
            return newState
          })
          toast.success('Role updated successfully')
        } else {
          toast.error(result.error || 'Failed to update role')
        }
      } catch (error) {
        console.error('Save error:', error)
        if (error instanceof Error) {
          if (error.message.includes('404')) {
            toast.error('Role assignment not found - it may have been deleted')
          } else if (error.message.includes('403')) {
            toast.error('Permission denied - you cannot update this role assignment')
          } else if (error.message.includes('400')) {
            toast.error('Invalid data provided - please check your inputs')
          } else if (error.message.includes('500')) {
            toast.error('Database error - please try again or contact support')
          } else {
            toast.error(`Update failed: ${error.message}`)
          }
        } else {
          toast.error('An unexpected error occurred while updating role')
        }
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleCancelEdit = (assignmentId: string) => {
    setEditingRoles(prev => {
      const newState = { ...prev }
      delete newState[assignmentId]
      return newState
    })
  }

  const updateEditField = (assignmentId: string, field: string, value: any) => {
    setEditingRoles(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: value
      }
    }))
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
              {assignments.map((assignment) => {
                const editData = editingRoles[assignment.id]
                const isEditing = Boolean(editData)
                const isLoading = pendingAction === assignment.id
                
                return (
                  <div
                    key={assignment.id}
                    className={`p-4 border border-border rounded-lg ${isEditing ? 'border-blue-300 bg-blue-50/30' : ''}`}
                    style={{ borderLeftColor: assignment.job_role.color_code, borderLeftWidth: '4px' }}
                  >
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{assignment.job_role.name}</h4>
                          <Badge variant="secondary">Editing</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Role Type</Label>
                            <select
                              value={editData?.is_lead ? 'lead' : 'regular'}
                              onChange={(e) => updateEditField(assignment.id, 'is_lead', e.target.value === 'lead')}
                              className="w-full px-3 py-2 border rounded-md"
                            >
                              <option value="regular">Regular Worker</option>
                              <option value="lead">Lead Worker</option>
                            </select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Proficiency Level</Label>
                            <select
                              value={editData?.proficiency_level || 1}
                              onChange={(e) => updateEditField(assignment.id, 'proficiency_level', Number(e.target.value))}
                              className="w-full px-3 py-2 border rounded-md"
                            >
                              <option value={1}>1 - Beginner</option>
                              <option value={2}>2 - Basic</option>
                              <option value={3}>3 - Intermediate</option>
                              <option value={4}>4 - Advanced</option>
                              <option value={5}>5 - Expert</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Notes (Optional)</Label>
                          <Textarea
                            value={editData?.notes || ''}
                            onChange={(e) => updateEditField(assignment.id, 'notes', e.target.value)}
                            placeholder="Add any notes about this role assignment..."
                            className="min-h-[80px]"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-sm text-muted-foreground">
                            Original: {editData?.original.is_lead ? 'Lead' : 'Regular'} • Level {editData?.original.proficiency_level || 1}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelEdit(assignment.id)}
                              disabled={isLoading}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(assignment.id)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-1" />
                              )}
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between">
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
                              <span>Assigned {new Date(assignment.assigned_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'numeric', 
                                day: 'numeric' 
                              })}</span>
                              {assignment.proficiency_level && (
                                <Badge variant="outline">
                                  Level {assignment.proficiency_level}/5
                                </Badge>
                              )}
                            </div>
                            {assignment.notes && (
                              <p className="text-sm text-muted-foreground italic">
                                Note: {assignment.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRole(assignment)}
                            disabled={isLoading || Object.keys(editingRoles).length > 0}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveRole(assignment)}
                            disabled={isLoading || Object.keys(editingRoles).length > 0}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No roles assigned
              </h3>
              <p className="text-muted-foreground mb-4">
                Assign job roles to track this worker's capabilities and specializations
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
      
      {/* Confirmation Dialog */}
      {DialogComponent}
    </div>
  )
}

// Role Assignment Form Component
interface RoleAssignmentFormProps {
  role: JobRole
  onAssign: (roleId: string, isLead: boolean, proficiencyLevel: number) => void
  onCancel: () => void
  isPending: boolean
}

function RoleAssignmentForm({ role, onAssign, onCancel, isPending }: RoleAssignmentFormProps) {
  const [isLead, setIsLead] = useState(false)
  const [proficiencyLevel, setProficiencyLevel] = useState(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAssign(role.id, isLead, proficiencyLevel)
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

      <div className="grid grid-cols-2 gap-4">
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
        
        <div className="space-y-2">
          <Label htmlFor="proficiency_level">Proficiency Level</Label>
          <select
            id="proficiency_level"
            value={proficiencyLevel}
            onChange={(e) => setProficiencyLevel(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value={1}>1 - Beginner</option>
            <option value={2}>2 - Basic</option>
            <option value={3}>3 - Intermediate</option>
            <option value={4}>4 - Advanced</option>
            <option value={5}>5 - Expert</option>
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