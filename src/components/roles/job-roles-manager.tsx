'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Users, 
  Briefcase,
  Loader2,
  Plus,
  Settings,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import { deleteJobRole, toggleJobRoleStatus, type JobRole } from '@/app/actions/job-roles'
import { JobRoleForm } from './job-role-form'

interface JobRolesManagerProps {
  initialRoles: JobRole[]
  userRole: string
}

export function JobRolesManager({ initialRoles, userRole }: JobRolesManagerProps) {
  const [roles, setRoles] = useState<JobRole[]>(initialRoles)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [editingRole, setEditingRole] = useState<JobRole | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  // Filter roles based on search and status
  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && role.is_active) ||
                         (filterStatus === 'inactive' && !role.is_active)
    return matchesSearch && matchesStatus
  })

  const handleDeleteRole = (roleId: string) => {
    if (userRole !== 'admin') {
      toast.error('Only administrators can delete job roles')
      return
    }

    const role = roles.find(r => r.id === roleId)
    if (!role) return

    if (!confirm(`Are you sure you want to delete "${role.name}"? This action cannot be undone.`)) {
      return
    }

    setPendingAction(roleId)
    startTransition(async () => {
      try {
        const result = await deleteJobRole(roleId)
        if (result.success) {
          setRoles(prev => prev.filter(r => r.id !== roleId))
          toast.success('Job role deleted successfully')
        } else {
          toast.error(result.error || 'Failed to delete job role')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleToggleStatus = (roleId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    setPendingAction(roleId)
    
    startTransition(async () => {
      try {
        const result = await toggleJobRoleStatus(roleId, newStatus)
        if (result.success) {
          setRoles(prev => prev.map(r => 
            r.id === roleId ? { ...r, is_active: newStatus } : r
          ))
          toast.success(`Job role ${newStatus ? 'activated' : 'deactivated'} successfully`)
        } else {
          toast.error(result.error || 'Failed to update job role status')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleRoleCreated = (newRole: JobRole) => {
    setRoles(prev => [newRole, ...prev])
    setShowCreateForm(false)
    toast.success('Job role created successfully')
  }

  const handleRoleUpdated = (updatedRole: JobRole) => {
    setRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r))
    setEditingRole(null)
    toast.success('Job role updated successfully')
  }

  const getPhysicalDemandColor = (demands?: string) => {
    switch (demands?.toLowerCase()) {
      case 'light': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'heavy': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      {(showCreateForm || editingRole) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRole ? 'Edit Job Role' : 'Create New Job Role'}
            </CardTitle>
            <CardDescription>
              {editingRole ? 'Update the job role details' : 'Define a new job role for your team'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JobRoleForm
              role={editingRole}
              onSuccess={editingRole ? handleRoleUpdated : handleRoleCreated}
              onCancel={() => {
                setEditingRole(null)
                setShowCreateForm(false)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Job Roles</CardTitle>
          <CardDescription>Manage your team's job roles and requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Roles</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {!showCreateForm && !editingRole && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            )}
          </div>

          {/* Roles Grid */}
          {filteredRoles.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No roles found' : 'No job roles yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first job role to get started'
                }
              </p>
              {!showCreateForm && !editingRole && (!searchTerm && filterStatus === 'all') && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Role
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRoles.map((role) => (
                <Card key={role.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: role.color_code }}
                        />
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                      </div>
                      <Badge variant={role.is_active ? "default" : "secondary"}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {role.description && (
                      <CardDescription>{role.description}</CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Physical Demands */}
                    {role.physical_demands && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Physical Demands:</span>
                        <Badge className={getPhysicalDemandColor(role.physical_demands)}>
                          {role.physical_demands}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Hourly Rate */}
                    {role.hourly_rate_base && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Base Rate:</span>
                        <span className="text-sm font-medium">
                          ${role.hourly_rate_base}/hr
                        </span>
                      </div>
                    )}
                    
                    {/* Required Certifications */}
                    {role.required_certifications && role.required_certifications.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Required Certifications:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {role.required_certifications.slice(0, 2).map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                          {role.required_certifications.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.required_certifications.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Equipment */}
                    {role.equipment_required && role.equipment_required.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Equipment Required:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {role.equipment_required.slice(0, 2).map((equipment, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {equipment}
                            </Badge>
                          ))}
                          {role.equipment_required.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.equipment_required.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingRole(role)}
                          disabled={isPending}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(role.id, role.is_active)}
                          disabled={isPending || pendingAction === role.id}
                        >
                          {pendingAction === role.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : role.is_active ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        
                        {userRole === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id)}
                            disabled={isPending || pendingAction === role.id}
                          >
                            {pendingAction === role.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {new Date(role.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}