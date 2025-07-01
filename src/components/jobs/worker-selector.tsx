'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Star,
  Clock,
  DollarSign,
  Crown,
  CheckCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
  User,
  Wrench,
  Award,
  TrendingUp
} from 'lucide-react'
import { generateAssignmentSuggestions, type AssignmentSuggestion, type JobData } from '@/lib/job-assignment'
import { type JobRequirement } from '@/lib/worker-availability'
import { getWorkerUtilization, formatUtilization, getUtilizationStatus, type WorkerUtilization } from '@/lib/worker-utilization'

interface WorkerSelectorProps {
  jobData: JobData
  requirements: JobRequirement[]
  teamId: string
  onAssignmentSelect: (assignment: AssignmentSuggestion) => void
  selectedAssignment?: AssignmentSuggestion | null
}

export function WorkerSelector({ 
  jobData, 
  requirements, 
  teamId, 
  onAssignmentSelect,
  selectedAssignment 
}: WorkerSelectorProps) {
  const [suggestions, setSuggestions] = useState<AssignmentSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workerUtilizations, setWorkerUtilizations] = useState<Map<string, WorkerUtilization>>(new Map())

  // Helper function to compare assignments by content
  const isSameAssignment = (a: AssignmentSuggestion | null, b: AssignmentSuggestion) => {
    if (!a) return false
    
    // Compare key properties that make assignments unique
    if (a.type !== b.type) return false
    if (a.crew_id !== b.crew_id) return false
    if (a.workers.length !== b.workers.length) return false
    
    // Compare worker IDs
    const aWorkerIds = a.workers.map(w => w.worker_id).sort()
    const bWorkerIds = b.workers.map(w => w.worker_id).sort()
    
    return aWorkerIds.every((id, index) => id === bWorkerIds[index])
  }

  useEffect(() => {
    if (requirements.length > 0 && teamId) {
      generateSuggestions()
    }
  }, [requirements, teamId, jobData.start, jobData.finish])

  // Separate useEffect for auto-selection to handle timing properly
  useEffect(() => {
    console.log('🔄 WORKER SELECTOR: Auto-selection effect triggered')
    console.log('🔄 WORKER SELECTOR: selectedAssignment:', selectedAssignment)
    console.log('🔄 WORKER SELECTOR: suggestions.length:', suggestions.length)
    
    if (!selectedAssignment && suggestions.length > 0) {
      console.log('✅ WORKER SELECTOR: Auto-selecting best suggestion (useEffect):', suggestions[0])
      onAssignmentSelect(suggestions[0])
    }
  }, [suggestions, selectedAssignment, onAssignmentSelect])

  const generateSuggestions = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const results = await generateAssignmentSuggestions(jobData, requirements, teamId)
      setSuggestions(results)
      
      // Load utilization data for all workers
      const utilizationMap = new Map<string, WorkerUtilization>()
      for (const suggestion of results) {
        for (const worker of suggestion.workers) {
          if (!utilizationMap.has(worker.worker_id)) {
            try {
              const utilization = await getWorkerUtilization(worker.worker_id)
              if (utilization) {
                console.log('Loaded utilization for worker:', worker.worker_name, utilization)
                utilizationMap.set(worker.worker_id, utilization)
              } else {
                console.log('No utilization data for worker:', worker.worker_name)
              }
            } catch (error) {
              console.error('Error loading utilization for worker:', worker.worker_name, error)
            }
          }
        }
      }
      setWorkerUtilizations(utilizationMap)
      console.log('Final utilization map:', utilizationMap)
      
      // Auto-selection now handled by useEffect
    } catch (err) {
      setError('Failed to generate worker suggestions')
      console.error('Error generating suggestions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-blue-600 bg-blue-50'
    if (score >= 40) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match'
    if (score >= 60) return 'Good Match'
    if (score >= 40) return 'Fair Match'
    return 'Poor Match'
  }

  if (requirements.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Job Roles Selected</h3>
            <p className="text-muted-foreground">
              Add job roles above to see worker recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Worker Assignment Suggestions</CardTitle>
            <CardDescription>
              AI-powered recommendations based on availability, skills, utilization, and fairness
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {suggestions.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => suggestions.length > 0 && onAssignmentSelect(suggestions[0])}
                disabled={isLoading}
              >
                <Zap className="h-4 w-4 mr-2" />
                Auto Assign Best
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={generateSuggestions}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Finding Workers...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => {
              // Create a stable key based on suggestion content
              const suggestionKey = `${suggestion.type}-${suggestion.crew_id || 'individual'}-${suggestion.workers.map(w => w.worker_id).join('-')}`
              return (
              <div
                key={suggestionKey}
                className={`p-6 border rounded-xl cursor-pointer transition-all duration-200 bg-white ${
                  isSameAssignment(selectedAssignment, suggestion)
                    ? 'border-blue-500 border-2 shadow-lg ring-4 ring-blue-100' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => {
                  console.log('🖱️ WORKER SELECTOR: Card clicked for suggestion:', suggestion)
                  onAssignmentSelect(suggestion)
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      {suggestion.type === 'crew' ? (
                        <Wrench className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {suggestion.type === 'crew' ? suggestion.crew_name : 'Individual Assignment'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {suggestion.workers.length} worker{suggestion.workers.length !== 1 ? 's' : ''}
                        {suggestion.type === 'crew' && ' from crew'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {index === 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ⭐ Best Match
                      </span>
                    )}
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{suggestion.total_score}%</div>
                      <div className="text-xs text-gray-500">{getScoreLabel(suggestion.total_score)}</div>
                    </div>
                    {isSameAssignment(selectedAssignment, suggestion) && (
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Workers List */}
                <div className="space-y-3 mb-4">
                  {suggestion.workers.map((worker, workerIndex) => (
                    <div
                      key={workerIndex}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-700">
                            {worker.worker_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{worker.worker_name}</span>
                            {worker.is_lead && (
                              <div className="flex items-center space-x-1 px-2 py-0.5 bg-yellow-100 rounded-full">
                                <Crown className="h-3 w-3 text-yellow-600" />
                                <span className="text-xs font-medium text-yellow-700">Lead</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-sm text-gray-600 font-medium">{worker.role_name}</span>
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="h-3 w-3 text-gray-400" />
                              {workerUtilizations.has(worker.worker_id) ? (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getUtilizationStatus(workerUtilizations.get(worker.worker_id)!.utilization_percentage).color}`}>
                                  {workerUtilizations.get(worker.worker_id)!.utilization_percentage.toFixed(0)}% busy
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Loading...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-right">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-700">{worker.score}</span>
                          </div>
                          <span className="text-xs text-gray-500">Match Score</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">${worker.suggested_rate}/hr</span>
                          </div>
                          <span className="text-xs text-gray-500">Rate</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded bg-green-100">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">${suggestion.estimated_cost.toFixed(0)}</div>
                        <div className="text-xs text-gray-500">Estimated Cost</div>
                      </div>
                    </div>
                    {suggestion.conflicts.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="p-1 rounded bg-orange-100">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-orange-700">{suggestion.conflicts.length} issue{suggestion.conflicts.length !== 1 ? 's' : ''}</div>
                          <div className="text-xs text-orange-600">Needs attention</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {isSameAssignment(selectedAssignment, suggestion) ? (
                      <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-lg border border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Selected</span>
                      </div>
                    ) : (
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-6 py-2"
                        size="sm"
                        onClick={(e) => {
                          console.log('🔲 WORKER SELECTOR: Select button clicked for suggestion:', suggestion)
                          e.stopPropagation()
                          onAssignmentSelect(suggestion)
                        }}
                      >
                        Select This Option
                      </Button>
                    )}
                </div>

                {/* Conflicts Details */}
                {suggestion.conflicts.length > 0 && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <h5 className="text-sm font-medium text-orange-800">Issues to Review:</h5>
                    </div>
                    <ul className="text-sm text-orange-700 space-y-1 ml-6">
                      {suggestion.conflicts.map((conflict, i) => (
                        <li key={i} className="list-disc">{conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Workers Available</h3>
            <p className="text-muted-foreground mb-4">
              No workers found that meet the job requirements. Try adjusting the time slot or requirements.
            </p>
            <Button onClick={generateSuggestions} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="text-sm font-medium text-blue-900 mb-3">How we select the best workers:</h5>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Worker availability during the scheduled time</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Qualifications and certifications for the role</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Past performance ratings and experience</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Fair work distribution based on weekly hours</span>
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}