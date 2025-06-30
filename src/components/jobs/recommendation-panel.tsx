'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Lightbulb, 
  Clock, 
  Users, 
  UserPlus, 
  GraduationCap,
  Calendar,
  Scissors,
  Settings,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  Star,
  Zap
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { JobRecommendation, QuickAction } from '@/lib/job-validation'

interface RecommendationPanelProps {
  recommendations: JobRecommendation[]
  onActionClick: (action: QuickAction) => void
  className?: string
}

interface RecommendationCardProps {
  recommendation: JobRecommendation
  onActionClick: (action: QuickAction) => void
  className?: string
}

export function RecommendationPanel({ 
  recommendations, 
  onActionClick, 
  className = '' 
}: RecommendationPanelProps) {
  const [activeTab, setActiveTab] = useState('all')

  if (recommendations.length === 0) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-900 mb-2">All Set!</h3>
            <p className="text-green-700">
              No recommendations needed. Your job configuration looks great!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Categorize recommendations
  const quickFixes = recommendations.filter(r => r.effort === 'quick')
  const improvements = recommendations.filter(r => r.effort === 'moderate')
  const strategic = recommendations.filter(r => r.effort === 'complex')

  const highImpact = recommendations.filter(r => r.impact === 'high')

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          <CardTitle>Smart Recommendations</CardTitle>
        </div>
        <CardDescription>
          AI-powered suggestions to optimize your job creation and team performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All ({recommendations.length})
            </TabsTrigger>
            <TabsTrigger value="quick" className="text-xs">
              Quick ({quickFixes.length})
            </TabsTrigger>
            <TabsTrigger value="high-impact" className="text-xs">
              High Impact ({highImpact.length})
            </TabsTrigger>
            <TabsTrigger value="strategic" className="text-xs">
              Strategic ({strategic.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
            <RecommendationList 
              recommendations={recommendations} 
              onActionClick={onActionClick}
              showCategories={true}
            />
          </TabsContent>

          <TabsContent value="quick" className="space-y-3 mt-4">
            {quickFixes.length > 0 ? (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Quick wins you can implement right now
                  </span>
                </div>
                <RecommendationList 
                  recommendations={quickFixes} 
                  onActionClick={onActionClick}
                />
              </>
            ) : (
              <EmptyState 
                icon={<Zap className="h-8 w-8 text-muted-foreground" />}
                title="No Quick Fixes Available"
                description="All current recommendations require more planning or setup."
              />
            )}
          </TabsContent>

          <TabsContent value="high-impact" className="space-y-3 mt-4">
            {highImpact.length > 0 ? (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    High-impact improvements for your team
                  </span>
                </div>
                <RecommendationList 
                  recommendations={highImpact} 
                  onActionClick={onActionClick}
                />
              </>
            ) : (
              <EmptyState 
                icon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
                title="No High-Impact Items"
                description="Your current setup is well optimized!"
              />
            )}
          </TabsContent>

          <TabsContent value="strategic" className="space-y-3 mt-4">
            {strategic.length > 0 ? (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <Settings className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">
                    Strategic improvements for long-term growth
                  </span>
                </div>
                <RecommendationList 
                  recommendations={strategic} 
                  onActionClick={onActionClick}
                />
              </>
            ) : (
              <EmptyState 
                icon={<Settings className="h-8 w-8 text-muted-foreground" />}
                title="No Strategic Items"
                description="Focus on quick wins and immediate improvements first."
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function RecommendationList({ 
  recommendations, 
  onActionClick, 
  showCategories = false 
}: {
  recommendations: JobRecommendation[]
  onActionClick: (action: QuickAction) => void
  showCategories?: boolean
}) {
  return (
    <div className="space-y-3">
      {recommendations.map((recommendation, index) => (
        <RecommendationCard
          key={index}
          recommendation={recommendation}
          onActionClick={onActionClick}
        />
      ))}
    </div>
  )
}

function RecommendationCard({ 
  recommendation, 
  onActionClick, 
  className = '' 
}: RecommendationCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleActionClick = async () => {
    setIsProcessing(true)
    try {
      await onActionClick(recommendation.action)
    } finally {
      setIsProcessing(false)
    }
  }

  const getTypeIcon = () => {
    switch (recommendation.type) {
      case 'alternative_time':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'hire_worker':
        return <UserPlus className="h-4 w-4 text-green-600" />
      case 'train_worker':
        return <GraduationCap className="h-4 w-4 text-purple-600" />
      case 'split_job':
        return <Scissors className="h-4 w-4 text-orange-600" />
      case 'use_crew':
        return <Users className="h-4 w-4 text-teal-600" />
      case 'adjust_requirements':
        return <Settings className="h-4 w-4 text-gray-600" />
      default:
        return <Lightbulb className="h-4 w-4 text-yellow-600" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'quick':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'complex':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionIcon = () => {
    switch (recommendation.action.type) {
      case 'navigate':
        return <ExternalLink className="h-3 w-3" />
      case 'modal':
        return <Settings className="h-3 w-3" />
      default:
        return <ChevronRight className="h-3 w-3" />
    }
  }

  return (
    <Card className={`hover:shadow-md transition-all cursor-pointer ${className}`}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getTypeIcon()}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1">
                  {recommendation.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {recommendation.description}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <Badge className={`text-xs ${getImpactColor(recommendation.impact)}`}>
                {recommendation.impact} impact
              </Badge>
              <Badge className={`text-xs ${getEffortColor(recommendation.effort)}`}>
                {recommendation.effort}
              </Badge>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleActionClick}
              disabled={isProcessing}
              size="sm"
              variant={recommendation.action.priority === 'high' ? 'default' : 'outline'}
              className="text-sm"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{recommendation.action.label}</span>
                  {getActionIcon()}
                </div>
              )}
            </Button>
          </div>

          {/* Additional Data Display */}
          {recommendation.data && (
            <div className="pt-2 border-t border-border">
              <AdditionalDataDisplay 
                type={recommendation.type} 
                data={recommendation.data} 
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AdditionalDataDisplay({ type, data }: { type: string, data: any }) {
  if (!data) return null

  switch (type) {
    case 'alternative_time':
      if (data.alternativeSlots) {
        return (
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Alternative Time Slots:</h5>
            <div className="space-y-1">
              {data.alternativeSlots.slice(0, 3).map((slot: any, index: number) => (
                <div key={index} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  {slot.start.toLocaleDateString()} at {slot.start.toLocaleTimeString()} 
                  - {slot.availableWorkers} workers available
                </div>
              ))}
            </div>
          </div>
        )
      }
      break

    case 'hire_worker':
      if (data.suggestedCount) {
        return (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>Suggested: {data.suggestedCount} workers</span>
              <span>Urgency: {data.urgency}</span>
            </div>
          </div>
        )
      }
      break

    case 'train_worker':
      if (data.currentRoles) {
        return (
          <div className="text-xs text-muted-foreground">
            <div>Current roles: {data.currentRoles.join(', ')}</div>
            <div>Expected benefit: {data.expectedBenefit}</div>
          </div>
        )
      }
      break

    case 'split_job':
      if (data.suggestedDays) {
        return (
          <div className="text-xs text-muted-foreground">
            Split across {data.suggestedDays} days 
            ({data.hoursPerDay} hours per day)
          </div>
        )
      }
      break

    default:
      return null
  }

  return null
}

function EmptyState({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="text-center py-8">
      <div className="mb-4">{icon}</div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

// Compact recommendation summary for showing in other components
export function RecommendationSummary({ 
  recommendations,
  onViewAll,
  className = ''
}: {
  recommendations: JobRecommendation[]
  onViewAll?: () => void
  className?: string
}) {
  if (recommendations.length === 0) return null

  const quickFixes = recommendations.filter(r => r.effort === 'quick').length
  const highImpact = recommendations.filter(r => r.impact === 'high').length

  return (
    <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <div>
              <h4 className="font-medium text-yellow-900">
                {recommendations.length} Recommendation{recommendations.length !== 1 ? 's' : ''}
              </h4>
              <p className="text-sm text-yellow-700">
                {quickFixes > 0 && `${quickFixes} quick fix${quickFixes !== 1 ? 'es' : ''}`}
                {quickFixes > 0 && highImpact > 0 && ', '}
                {highImpact > 0 && `${highImpact} high impact`}
              </p>
            </div>
          </div>
          
          {onViewAll && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewAll}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default RecommendationPanel