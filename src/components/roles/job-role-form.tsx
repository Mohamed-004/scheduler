'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createJobRole, updateJobRole, type JobRole, type CreateJobRoleData } from '@/app/actions/job-roles'

interface JobRoleFormProps {
  role?: JobRole | null
  onSuccess: (role: JobRole) => void
  onCancel: () => void
}

const PHYSICAL_DEMANDS_OPTIONS = [
  { value: 'Light', label: 'Light', description: 'Minimal physical effort required' },
  { value: 'Medium', label: 'Medium', description: 'Moderate physical effort required' },
  { value: 'Heavy', label: 'Heavy', description: 'Significant physical effort required' }
]

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
]

const COMMON_CERTIFICATIONS = [
  'Window Cleaning Certification',
  'Pressure Washing Certification',
  'Landscaping License',
  'Electrical License',
  'Plumbing License',
  'Safety Certification',
  'OSHA Training',
  'First Aid/CPR',
  'Commercial Driving License'
]

const COMMON_EQUIPMENT = [
  'Basic Tools',
  'Squeegees',
  'Cleaning Solutions',
  'Ladder',
  'Pressure Washer',
  'Safety Equipment',
  'Landscaping Tools',
  'Mower',
  'Electrical Tools',
  'Plumbing Tools'
]

export function JobRoleForm({ role, onSuccess, onCancel }: JobRoleFormProps) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<CreateJobRoleData>({
    name: role?.name || '',
    description: role?.description || '',
    hourly_rate_base: role?.hourly_rate_base || undefined,
    hourly_rate_multiplier: role?.hourly_rate_multiplier || 1.0,
    required_certifications: role?.required_certifications || [],
    physical_demands: role?.physical_demands || '',
    equipment_required: role?.equipment_required || [],
    color_code: role?.color_code || '#3B82F6'
  })

  const [newCertification, setNewCertification] = useState('')
  const [newEquipment, setNewEquipment] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Role name is required')
      return
    }

    startTransition(async () => {
      try {
        let result
        if (role) {
          result = await updateJobRole(role.id, formData)
        } else {
          result = await createJobRole(formData)
        }

        if (result.success) {
          onSuccess(result.data!)
        } else {
          toast.error(result.error || 'Failed to save job role')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      }
    })
  }

  const addCertification = (cert: string) => {
    if (cert.trim() && !formData.required_certifications?.includes(cert.trim())) {
      setFormData(prev => ({
        ...prev,
        required_certifications: [...(prev.required_certifications || []), cert.trim()]
      }))
      setNewCertification('')
    }
  }

  const removeCertification = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      required_certifications: prev.required_certifications?.filter(c => c !== cert) || []
    }))
  }

  const addEquipment = (equipment: string) => {
    if (equipment.trim() && !formData.equipment_required?.includes(equipment.trim())) {
      setFormData(prev => ({
        ...prev,
        equipment_required: [...(prev.equipment_required || []), equipment.trim()]
      }))
      setNewEquipment('')
    }
  }

  const removeEquipment = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      equipment_required: prev.equipment_required?.filter(e => e !== equipment) || []
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Role Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Window Cleaner"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="physical_demands">Physical Demands</Label>
          <select
            id="physical_demands"
            value={formData.physical_demands || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, physical_demands: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select level...</option>
            {PHYSICAL_DEMANDS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Describe the role and its responsibilities..."
        />
      </div>

      {/* Pricing */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hourly_rate_base">Base Hourly Rate</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="hourly_rate_base"
              type="number"
              step="0.01"
              min="0"
              value={formData.hourly_rate_base || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                hourly_rate_base: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              className="pl-8"
              placeholder="25.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hourly_rate_multiplier">Rate Multiplier</Label>
          <Input
            id="hourly_rate_multiplier"
            type="number"
            step="0.1"
            min="0.1"
            max="5.0"
            value={formData.hourly_rate_multiplier || 1.0}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              hourly_rate_multiplier: parseFloat(e.target.value) || 1.0 
            }))}
            placeholder="1.0"
          />
          <p className="text-xs text-muted-foreground">
            Multiplies worker's base rate (1.0 = no change, 1.5 = 50% premium)
          </p>
        </div>
      </div>

      {/* Color Selection */}
      <div className="space-y-2">
        <Label>Role Color</Label>
        <div className="flex items-center space-x-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, color_code: color }))}
              className={`w-8 h-8 rounded-full border-2 ${
                formData.color_code === color ? 'border-gray-400' : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <Input
            type="color"
            value={formData.color_code}
            onChange={(e) => setFormData(prev => ({ ...prev, color_code: e.target.value }))}
            className="w-12 h-8 p-1 border rounded"
          />
        </div>
      </div>

      {/* Required Certifications */}
      <div className="space-y-3">
        <Label>Required Certifications</Label>
        
        {/* Common Certifications */}
        <div className="flex flex-wrap gap-2">
          {COMMON_CERTIFICATIONS.map(cert => (
            <button
              key={cert}
              type="button"
              onClick={() => addCertification(cert)}
              disabled={formData.required_certifications?.includes(cert)}
              className={`px-2 py-1 text-xs rounded border ${
                formData.required_certifications?.includes(cert)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 cursor-pointer'
              }`}
            >
              {cert}
            </button>
          ))}
        </div>

        {/* Add Custom Certification */}
        <div className="flex items-center space-x-2">
          <Input
            value={newCertification}
            onChange={(e) => setNewCertification(e.target.value)}
            placeholder="Add custom certification..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCertification(newCertification)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCertification(newCertification)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected Certifications */}
        {formData.required_certifications && formData.required_certifications.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.required_certifications.map(cert => (
              <Badge key={cert} variant="default" className="flex items-center space-x-1">
                <span>{cert}</span>
                <button
                  type="button"
                  onClick={() => removeCertification(cert)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Required Equipment */}
      <div className="space-y-3">
        <Label>Required Equipment</Label>
        
        {/* Common Equipment */}
        <div className="flex flex-wrap gap-2">
          {COMMON_EQUIPMENT.map(equipment => (
            <button
              key={equipment}
              type="button"
              onClick={() => addEquipment(equipment)}
              disabled={formData.equipment_required?.includes(equipment)}
              className={`px-2 py-1 text-xs rounded border ${
                formData.equipment_required?.includes(equipment)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 cursor-pointer'
              }`}
            >
              {equipment}
            </button>
          ))}
        </div>

        {/* Add Custom Equipment */}
        <div className="flex items-center space-x-2">
          <Input
            value={newEquipment}
            onChange={(e) => setNewEquipment(e.target.value)}
            placeholder="Add custom equipment..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addEquipment(newEquipment)
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addEquipment(newEquipment)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected Equipment */}
        {formData.equipment_required && formData.equipment_required.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.equipment_required.map(equipment => (
              <Badge key={equipment} variant="secondary" className="flex items-center space-x-1">
                <span>{equipment}</span>
                <button
                  type="button"
                  onClick={() => removeEquipment(equipment)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 pt-4 border-t">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {role ? 'Update Role' : 'Create Role'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}