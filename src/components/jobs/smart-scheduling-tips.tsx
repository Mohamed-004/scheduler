'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Alert,
  AlertDescription,
  AlertTitle 
} from '@/components/ui/alert'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible'
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Lightbulb,
  Clock,
  Users,
  DollarSign,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { intelligentScheduler, type SchedulingResult, type SchedulingIssue } from '@/lib/intelligent-scheduling'

interface SmartSchedulingTipsProps {
  teamId: string
  scheduledDate?: string
  startTime?: string
  endTime?: string
  requiredWorkers?: number
  requiredRoles?: string[]
  onActionClick?: (action: string, data?: any) => void
  className?: string
}

export function SmartSchedulingTips({ 
  teamId, 
  scheduledDate, 
  startTime, 
  endTime, 
  requiredWorkers = 1,
  requiredRoles = [],
  onActionClick,
  className = '' 
}: SmartSchedulingTipsProps) {
  const [validationResult, setValidationResult] = useState<SchedulingResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [expandedIssues, setExpandedIssues] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (scheduledDate && startTime && endTime && teamId) {
      validateScheduling()
    } else {
      setValidationResult(null)
    }
  }, [teamId, scheduledDate, startTime, endTime, requiredWorkers, requiredRoles])

  const validateScheduling = async () => {
    if (!scheduledDate || !startTime || !endTime) return

    setIsValidating(true)
    try {
      const result = await intelligentScheduler.validateJobScheduling({
        teamId,
        scheduledDate,
        startTime,
        endTime,
        requiredWorkers,
        requiredRoles
      })
      setValidationResult(result)
    } catch (error) {
      console.error('Validation failed:', error)
      setValidationResult({
        valid: false,
        issues: [{
          type: 'error',
          code: 'VALIDATION_FAILED',
          title: 'Validation Failed',
          message: 'Unable to validate scheduling. Please try again.',
          suggestions: ['Refresh and try again']
        }],
        suggestions: { available_slots: [], best_times: [] }
      })
    } finally {
      setIsValidating(false)
    }
  }

  const toggleIssueExpansion = (issueCode: string) => {
    setExpandedIssues(prev => 
      prev.includes(issueCode) 
        ? prev.filter(code => code !== issueCode)
        : [...prev, issueCode]
    )
  }

  const handleActionClick = (action: string, data?: any) => {
    if (onActionClick) {
      onActionClick(action, data)
    } else {
      // Default action handling
      switch (action) {
        case 'navigate':
          if (data && typeof window !== 'undefined') {
            window.location.href = data
          }
          break
        case 'refresh':
          validateScheduling()
          break
        default:
          console.log('Action:', action, data)
      }
    }
  }

  const getIssueIcon = (type: SchedulingIssue['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const getIssueStyles = (type: SchedulingIssue['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50 text-red-900'
      case 'warning':
        return 'border-orange-200 bg-orange-50 text-orange-900'
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-900'
      default:
        return 'border-gray-200 bg-gray-50 text-gray-900'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Don't show anything if no scheduling data provided
  if (!scheduledDate || !startTime || !endTime) {
    return (
      <Card className={`border-blue-200 bg-blue-50 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">Smart Scheduling Tips</h3>
              <p className="text-sm text-blue-700">
                Set a date and time to get intelligent scheduling suggestions and validation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isValidating) {
    return (
      <Card className={`border-blue-200 bg-blue-50 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <h3 className="font-medium text-blue-900">Validating Schedule</h3>
              <p className="text-sm text-blue-700">
                Checking worker availability and generating suggestions...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!validationResult) {
    return null
  }

  const errors = validationResult.issues.filter(i => i.type === 'error')
  const warnings = validationResult.issues.filter(i => i.type === 'warning')
  const infos = validationResult.issues.filter(i => i.type === 'info')

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Status */}
      <Card className={validationResult.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {validationResult.valid ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <h3 className={`font-medium ${validationResult.valid ? 'text-green-900' : 'text-red-900'}`}>
                  {validationResult.valid ? 'Schedule Looks Good!' : 'Schedule Needs Attention'}
                </h3>
                <p className={`text-sm ${validationResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                  {validationResult.valid 
                    ? 'No critical issues found with this schedule.'
                    : `${errors.length} error(s) need to be resolved.`
                  }
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => validateScheduling()}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues Display */}
      {validationResult.issues.length > 0 && (
        <div className="space-y-3">
          {/* Critical Errors */}
          {errors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-red-900">
                    {errors.length} Critical Issue{errors.length !== 1 ? 's' : ''}
                  </CardTitle>
                </div>
                <CardDescription className="text-red-700">
                  These must be resolved before creating the job.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {errors.map((issue, index) => (
                  <IssueCard 
                    key={`error-${index}`}
                    issue={issue}
                    isExpanded={expandedIssues.includes(issue.code)}
                    onToggleExpand={() => toggleIssueExpansion(issue.code)}
                    onActionClick={handleActionClick}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-orange-900">
                    {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
                  </CardTitle>
                </div>
                <CardDescription className="text-orange-700">
                  Consider addressing these for optimal scheduling.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {warnings.map((issue, index) => (
                  <IssueCard 
                    key={`warning-${index}`}
                    issue={issue}
                    isExpanded={expandedIssues.includes(issue.code)}
                    onToggleExpand={() => toggleIssueExpansion(issue.code)}
                    onActionClick={handleActionClick}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Info & Tips */}
          {infos.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-900">
                    Helpful Information
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {infos.map((issue, index) => (
                  <IssueCard 
                    key={`info-${index}`}
                    issue={issue}
                    isExpanded={expandedIssues.includes(issue.code)}
                    onToggleExpand={() => toggleIssueExpansion(issue.code)}
                    onActionClick={handleActionClick}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pay Estimate */}
      {validationResult.payEstimate && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-900">Estimated Labor Cost</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(validationResult.payEstimate.totalCost)}
              </div>
              
              {validationResult.payEstimate.workerCosts.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-green-700">
                      <Users className="h-4 w-4 mr-2" />
                      View Worker Breakdown
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-3">
                    {validationResult.payEstimate.workerCosts.map((worker, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-sm font-medium">{worker.workerName}</span>
                        <div className="text-right text-sm">
                          <div>{formatCurrency(worker.cost)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(worker.hourlyRate)}/hr
                          </div>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduling Suggestions */}
      {(validationResult.suggestions.available_slots.length > 0 || validationResult.suggestions.best_times.length > 0) && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-purple-900">Smart Suggestions</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-purple-700"
              >
                {showSuggestions ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {validationResult.suggestions.best_times.length > 0 && (
                  <div>
                    <h4 className="font-medium text-purple-900 mb-2">Optimal Time Slots</h4>
                    <div className="space-y-2">
                      {validationResult.suggestions.best_times.map((time, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm">{time}</span>
                          <Badge variant="outline" className="text-purple-700 border-purple-300">
                            Recommended
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {validationResult.suggestions.available_slots.length > 0 && (
                  <div>
                    <h4 className="font-medium text-purple-900 mb-2">Available Time Slots</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {validationResult.suggestions.available_slots.map((slot, index) => (
                        <div key={index} className="p-2 bg-white rounded border text-sm text-center">
                          {slot}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  )
}

interface IssueCardProps {
  issue: SchedulingIssue
  isExpanded: boolean
  onToggleExpand: () => void
  onActionClick: (action: string, data?: any) => void
}

function IssueCard({ issue, isExpanded, onToggleExpand, onActionClick }: IssueCardProps) {
  const getIssueIcon = (type: SchedulingIssue['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getIssueIcon(issue.type)}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground">{issue.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{issue.message}</p>
          </div>
        </div>
        
        {(issue.suggestions.length > 0 || issue.actions) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="ml-2 h-8 w-8 p-0"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleContent className="mt-3 space-y-3">
          {/* Suggestions */}
          {issue.suggestions.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2">Suggestions:</h5>
              <ul className="space-y-1">
                {issue.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          {issue.actions && issue.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {issue.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onActionClick(action.action, action.data)}
                  className="text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}