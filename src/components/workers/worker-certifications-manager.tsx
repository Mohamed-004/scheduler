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
  Shield,
  ShieldCheck,
  ShieldX,
  Calendar,
  Award,
  AlertCircle,
  Check,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  createWorkerCertification,
  updateWorkerCertification,
  deleteWorkerCertification,
  verifyCertification,
  type WorkerCertification,
  type CreateCertificationData
} from '@/app/actions/worker-certifications'

interface WorkerCertificationsManagerProps {
  workerId: string
  initialCertifications: WorkerCertification[]
  userRole: string
  canEdit: boolean // Whether the current user can edit certifications
}

export function WorkerCertificationsManager({ 
  workerId, 
  initialCertifications, 
  userRole,
  canEdit 
}: WorkerCertificationsManagerProps) {
  const [certifications, setCertifications] = useState<WorkerCertification[]>(initialCertifications)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCertification, setEditingCertification] = useState<WorkerCertification | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  // Filter certifications based on search
  const filteredCertifications = certifications.filter(cert =>
    cert.certification_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certifying_body?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateCertification = (data: CreateCertificationData) => {
    setPendingAction('create')
    startTransition(async () => {
      try {
        const result = await createWorkerCertification(workerId, data)
        if (result.success) {
          setCertifications(prev => [result.data!, ...prev])
          setShowCreateForm(false)
          toast.success('Certification added successfully')
        } else {
          toast.error(result.error || 'Failed to add certification')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleUpdateCertification = (id: string, data: Partial<CreateCertificationData>) => {
    setPendingAction(id)
    startTransition(async () => {
      try {
        const result = await updateWorkerCertification(id, data)
        if (result.success) {
          setCertifications(prev => prev.map(c => c.id === id ? result.data! : c))
          setEditingCertification(null)
          toast.success('Certification updated successfully')
        } else {
          toast.error(result.error || 'Failed to update certification')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleDeleteCertification = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return
    }

    setPendingAction(id)
    startTransition(async () => {
      try {
        const result = await deleteWorkerCertification(id)
        if (result.success) {
          setCertifications(prev => prev.filter(c => c.id !== id))
          toast.success('Certification deleted successfully')
        } else {
          toast.error(result.error || 'Failed to delete certification')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleVerifyCertification = (id: string, isVerified: boolean) => {
    setPendingAction(id)
    startTransition(async () => {
      try {
        const result = await verifyCertification(id, isVerified)
        if (result.success) {
          setCertifications(prev => prev.map(c => 
            c.id === id ? { ...c, is_verified: isVerified } : c
          ))
          toast.success(`Certification ${isVerified ? 'verified' : 'unverified'} successfully`)
        } else {
          toast.error(result.error || 'Failed to update verification status')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      } finally {
        setPendingAction(null)
      }
    })
  }

  const getProficiencyColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-red-100 text-red-800'
      case 2: return 'bg-orange-100 text-orange-800'
      case 3: return 'bg-yellow-100 text-yellow-800'
      case 4: return 'bg-blue-100 text-blue-800'
      case 5: return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProficiencyLabel = (level: number) => {
    switch (level) {
      case 1: return 'Beginner'
      case 2: return 'Basic'
      case 3: return 'Intermediate'
      case 4: return 'Advanced'
      case 5: return 'Expert'
      default: return 'Unknown'
    }
  }

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return expiry <= thirtyDaysFromNow && expiry >= today
  }

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      {(showCreateForm || editingCertification) && (
        <CertificationForm
          certification={editingCertification}
          onSubmit={editingCertification 
            ? (data) => handleUpdateCertification(editingCertification.id, data)
            : handleCreateCertification
          }
          onCancel={() => {
            setShowCreateForm(false)
            setEditingCertification(null)
          }}
          isPending={isPending}
        />
      )}

      {/* Header and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Certifications & Skills</CardTitle>
              <CardDescription>
                Manage worker certifications and skill levels
              </CardDescription>
            </div>
            {canEdit && !showCreateForm && !editingCertification && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Certification
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search certifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Certifications List */}
          {filteredCertifications.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? 'No certifications found' : 'No certifications yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Add certifications to track skills and qualifications'
                }
              </p>
              {canEdit && !showCreateForm && !searchTerm && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Certification
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCertifications.map((certification) => (
                <Card key={certification.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-lg">{certification.certification_name}</h4>
                          {certification.is_verified ? (
                            <ShieldCheck className="h-4 w-4 text-green-600" title="Verified" />
                          ) : (
                            <ShieldX className="h-4 w-4 text-gray-400" title="Not verified" />
                          )}
                          {isExpired(certification.expiry_date) && (
                            <Badge variant="destructive" className="text-xs">
                              Expired
                            </Badge>
                          )}
                          {isExpiringSoon(certification.expiry_date) && !isExpired(certification.expiry_date) && (
                            <Badge variant="destructive" className="text-xs bg-orange-500">
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                        
                        {certification.certifying_body && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Issued by: {certification.certifying_body}
                          </p>
                        )}
                      </div>
                      
                      <Badge className={getProficiencyColor(certification.proficiency_level)}>
                        {getProficiencyLabel(certification.proficiency_level)}
                      </Badge>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2 mb-3">
                      {certification.certified_date && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-2" />
                          Certified: {new Date(certification.certified_date).toLocaleDateString()}
                        </div>
                      )}
                      {certification.expiry_date && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-2" />
                          Expires: {new Date(certification.expiry_date).toLocaleDateString()}
                        </div>
                      )}
                      {certification.certificate_number && (
                        <div className="text-sm text-muted-foreground">
                          Certificate #: {certification.certificate_number}
                        </div>
                      )}
                    </div>

                    {certification.notes && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {certification.notes}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-2">
                        {canEdit && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCertification(certification)}
                              disabled={isPending}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCertification(certification.id, certification.certification_name)}
                              disabled={isPending || pendingAction === certification.id}
                            >
                              {pendingAction === certification.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        )}
                        
                        {userRole === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyCertification(certification.id, !certification.is_verified)}
                            disabled={isPending || pendingAction === certification.id}
                          >
                            {pendingAction === certification.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : certification.is_verified ? (
                              <X className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            {certification.is_verified ? 'Unverify' : 'Verify'}
                          </Button>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(certification.created_at).toLocaleDateString()}
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

// Certification Form Component
interface CertificationFormProps {
  certification?: WorkerCertification | null
  onSubmit: (data: CreateCertificationData) => void
  onCancel: () => void
  isPending: boolean
}

function CertificationForm({ certification, onSubmit, onCancel, isPending }: CertificationFormProps) {
  const [formData, setFormData] = useState<CreateCertificationData>({
    certification_name: certification?.certification_name || '',
    proficiency_level: certification?.proficiency_level || 1,
    certified_date: certification?.certified_date || '',
    expiry_date: certification?.expiry_date || '',
    certifying_body: certification?.certifying_body || '',
    certificate_number: certification?.certificate_number || '',
    notes: certification?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.certification_name.trim()) {
      toast.error('Certification name is required')
      return
    }

    onSubmit(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {certification ? 'Edit Certification' : 'Add New Certification'}
        </CardTitle>
        <CardDescription>
          {certification ? 'Update certification details' : 'Add a new certification or skill'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="certification_name">Certification Name *</Label>
              <Input
                id="certification_name"
                value={formData.certification_name}
                onChange={(e) => setFormData(prev => ({ ...prev, certification_name: e.target.value }))}
                placeholder="e.g., Window Cleaning Certification"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proficiency_level">Proficiency Level</Label>
              <select
                id="proficiency_level"
                value={formData.proficiency_level}
                onChange={(e) => setFormData(prev => ({ ...prev, proficiency_level: parseInt(e.target.value) }))}
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="certified_date">Certified Date</Label>
              <Input
                id="certified_date"
                type="date"
                value={formData.certified_date}
                onChange={(e) => setFormData(prev => ({ ...prev, certified_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="certifying_body">Certifying Body</Label>
              <Input
                id="certifying_body"
                value={formData.certifying_body}
                onChange={(e) => setFormData(prev => ({ ...prev, certifying_body: e.target.value }))}
                placeholder="e.g., Professional Window Cleaners Association"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate_number">Certificate Number</Label>
              <Input
                id="certificate_number"
                value={formData.certificate_number}
                onChange={(e) => setFormData(prev => ({ ...prev, certificate_number: e.target.value }))}
                placeholder="e.g., PWC-2024-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Additional notes about this certification..."
            />
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Award className="h-4 w-4 mr-2" />
              )}
              {certification ? 'Update Certification' : 'Add Certification'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}