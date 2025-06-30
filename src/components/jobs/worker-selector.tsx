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
  Wrench
} from 'lucide-react'
import { generateAssignmentSuggestions, type AssignmentSuggestion, type JobData } from '@/lib/job-assignment'
import { type JobRequirement } from '@/lib/worker-availability'

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

  useEffect(() => {
    if (requirements.length > 0 && teamId) {
      generateSuggestions()
    }
  }, [requirements, teamId, jobData.start, jobData.finish])

  const generateSuggestions = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const results = await generateAssignmentSuggestions(jobData, requirements, teamId)
      setSuggestions(results)
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
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
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
              AI-powered recommendations based on availability, skills, and ratings
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSuggestions}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Finding Workers...' : 'Refresh Suggestions'}
          </Button>
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
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedAssignment === suggestion 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onAssignmentSelect(suggestion)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {suggestion.type === 'crew' ? (
                      <Wrench className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <h4 className="font-medium">
                        {suggestion.type === 'crew' ? suggestion.crew_name : 'Individual Assignment'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.workers.length} worker{suggestion.workers.length !== 1 ? 's' : ''}
                        {suggestion.type === 'crew' && ' from crew'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={getScoreColor(suggestion.total_score)}>
                      {suggestion.total_score}% {getScoreLabel(suggestion.total_score)}
                    </Badge>
                    {selectedAssignment === suggestion && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>

                {/* Workers List */}
                <div className="space-y-2 mb-3">
                  {suggestion.workers.map((worker, workerIndex) => (
                    <div
                      key={workerIndex}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {worker.worker_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1">
                            <span className="text-sm font-medium">{worker.worker_name}</span>
                            {worker.is_lead && (
                              <Crown className="h-3 w-3 text-yellow-600" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{worker.role_name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" />
                          <span>{worker.score}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>${worker.suggested_rate}/hr</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-3 w-3" />
                      <span>Est. Cost: ${suggestion.estimated_cost.toFixed(0)}</span>
                    </div>
                    {suggestion.conflicts.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                        <span className="text-orange-600">{suggestion.conflicts.length} conflict{suggestion.conflicts.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedAssignment === suggestion ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Selected
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm">
                      Select This Option
                    </Button>
                  )}
                </div>

                {/* Conflicts Details */}
                {suggestion.conflicts.length > 0 && (
                  <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
                    <h5 className="text-xs font-medium text-orange-800 mb-1">Potential Conflicts:</h5>
                    <ul className="text-xs text-orange-700 space-y-1">
                      {suggestion.conflicts.map((conflict, i) => (
                        <li key={i}>• {conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
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
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-sm font-medium text-blue-900 mb-1">How assignments are selected:</h5>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Worker availability during the scheduled time</li>
              <li>• Qualifications and certifications for the role</li>
              <li>• Past performance and ratings</li>
              <li>• Crew capabilities and coordination</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}