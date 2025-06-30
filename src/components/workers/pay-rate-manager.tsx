'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  DollarSign, 
  Edit, 
  History, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  TrendingUp 
} from 'lucide-react'
import { updatePayRate, getUserPayRate, getPayRateHistory } from '@/app/actions/pay-rates'
import type { PayRateUpdateData } from '@/types/database'

interface PayRateManagerProps {
  userId: string
  userRole: 'admin' | 'sales' | 'worker'
  className?: string
}

interface PayRateData {
  id: string
  name: string
  hourly_rate: number
  team_id: string
}

export function PayRateManager({ userId, userRole, className = '' }: PayRateManagerProps) {
  const [payRateData, setPayRateData] = useState<PayRateData | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [editForm, setEditForm] = useState<PayRateUpdateData>({
    hourly_rate: 0,
    reason: ''
  })

  useEffect(() => {
    loadPayRateData()
  }, [userId])

  const loadPayRateData = async () => {
    setIsLoading(true)
    try {
      const result = await getUserPayRate(userId)
      if (result.success && result.data) {
        setPayRateData(result.data)
        setEditForm({
          hourly_rate: result.data.hourly_rate || 0,
          reason: ''
        })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to load pay rate data' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load pay rate data' })
    } finally {
      setIsLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const result = await getPayRateHistory(userId)
      if (result.success && result.data) {
        setHistory(result.data)
      }
    } catch (error: any) {
      console.error('Failed to load pay rate history:', error)
    }
  }

  const handleUpdatePayRate = async () => {
    setIsUpdating(true)
    setMessage(null)

    try {
      const result = await updatePayRate(userId, editForm)
      if (result.success) {
        setMessage({ type: 'success', text: 'Pay rate updated successfully!' })
        setShowEditDialog(false)
        await loadPayRateData()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update pay rate' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update pay rate' })
    } finally {
      setIsUpdating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEffectiveHourlyRate = () => {
    if (!payRateData) return 0
    return payRateData.hourly_rate || 0
  }

  const isPayRateValid = () => {
    if (!payRateData) return false
    return (payRateData.hourly_rate || 0) > 0
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
            <span>Loading pay rate information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!payRateData) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">Failed to load pay rate information</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Pay Rate Information</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {isPayRateValid() ? (
              <Badge variant="outline" className="text-green-700 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Valid
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-700 border-red-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Needs Setup
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Current compensation details for {payRateData.name}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Pay Rate Display */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hourly Rate</Label>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(payRateData.hourly_rate || 0)}/hr
            </div>
          </div>
        </div>



        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {userRole === 'admin' && (
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Update Pay Rate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Pay Rate</DialogTitle>
                  <DialogDescription>
                    Update the compensation information for {payRateData.name}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="999.99"
                      value={editForm.hourly_rate}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        hourly_rate: parseFloat(e.target.value) || 0 
                      })}
                      placeholder="Enter hourly rate"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Change</Label>
                    <Input
                      id="reason"
                      placeholder="e.g., Annual review, promotion, market adjustment..."
                      value={editForm.reason}
                      onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button 
                      onClick={handleUpdatePayRate} 
                      disabled={isUpdating}
                      className="flex-1"
                    >
                      {isUpdating ? 'Updating...' : 'Update Pay Rate'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowEditDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {(userRole === 'admin' || userRole === 'sales') && (
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  onClick={loadHistory}
                >
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Pay Rate History</DialogTitle>
                  <DialogDescription>
                    Historical changes to {payRateData.name}'s compensation
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No pay rate changes recorded
                    </p>
                  ) : (
                    history.map((entry, index) => (
                      <div key={entry.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">
                            {formatDate(entry.created_at)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Changed by: {(entry as any).changed_by_user?.name}
                          </span>
                        </div>
                        
                        <div className="grid gap-2 text-sm">
                          {entry.old_salary_type !== entry.new_salary_type && (
                            <div>
                              <span className="font-medium">Pay Type: </span>
                              <span className="text-red-600">{entry.old_salary_type}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-600">{entry.new_salary_type}</span>
                            </div>
                          )}
                          
                          {entry.new_salary_type === 'hourly' && entry.old_hourly_rate !== entry.new_hourly_rate && (
                            <div>
                              <span className="font-medium">Hourly Rate: </span>
                              <span className="text-red-600">{formatCurrency(entry.old_hourly_rate || 0)}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-600">{formatCurrency(entry.new_hourly_rate || 0)}</span>
                            </div>
                          )}
                          
                          {entry.new_salary_type === 'salary' && entry.old_salary_amount !== entry.new_salary_amount && (
                            <div>
                              <span className="font-medium">Annual Salary: </span>
                              <span className="text-red-600">{formatCurrency(entry.old_salary_amount || 0)}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-600">{formatCurrency(entry.new_salary_amount || 0)}</span>
                            </div>
                          )}
                          
                          {entry.reason && (
                            <div>
                              <span className="font-medium">Reason: </span>
                              <span className="text-muted-foreground">{entry.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Warning for invalid pay rates */}
        {!isPayRateValid() && (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">Pay Rate Setup Required</span>
            </div>
            <p className="text-sm text-red-700">
              This worker needs a valid pay rate before they can be assigned to jobs. 
              {userRole === 'admin' && ' Please update their compensation information.'}
            </p>
          </div>
        )}

        {/* Success/Error Messages */}
        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  )
}