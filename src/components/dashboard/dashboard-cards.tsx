'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Users, 
  Building2, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Plus
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface DashboardCardsProps {
  data: {
    totalJobs: number
    pendingJobs: number
    activeJobs: number
    completedJobs: number
    totalWorkers: number
    activeWorkers: number
    totalClients: number
    totalCrews: number
    totalRevenue: number
  }
  userRole: 'admin' | 'sales' | 'worker' | 'client'
}

interface CardData {
  id: string
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  description: string
  color: string
  bgColor: string
  change: string
  trend: 'up' | 'down'
  prefix?: string
  format?: string
}

// Animated counter component
const AnimatedCounter = ({ 
  value, 
  duration = 1000 
}: { 
  value: number
  duration?: number 
}) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let start = 0
    const end = value
    const range = end - start
    const increment = Math.max(1, Math.ceil(range / 50))
    
    if (range === 0) return
    
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, duration / 50)
    
    return () => clearInterval(timer)
  }, [value, duration])
  
  return <span>{count}</span>
}

export const DashboardCards = ({ data, userRole }: DashboardCardsProps) => {
  // Define which cards to show based on role
  const getCardsForRole = (): CardData[] => {
    const baseCards: CardData[] = [
      {
        id: 'total-jobs',
        title: 'Total Jobs',
        value: data.totalJobs,
        icon: Calendar,
        description: 'All jobs in system',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        change: '+12%',
        trend: 'up' as const
      },
      {
        id: 'pending-jobs',
        title: 'Pending Jobs',
        value: data.pendingJobs,
        icon: Clock,
        description: 'Awaiting assignment',
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        change: '+5%',
        trend: 'up' as const
      },
      {
        id: 'active-jobs',
        title: 'Active Jobs',
        value: data.activeJobs,
        icon: AlertTriangle,
        description: 'Currently in progress',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        change: '-2%',
        trend: 'down' as const
      },
      {
        id: 'completed-jobs',
        title: 'Completed',
        value: data.completedJobs,
        icon: CheckCircle,
        description: 'Successfully finished',
        color: 'text-success',
        bgColor: 'bg-success/10',
        change: '+18%',
        trend: 'up' as const
      }
    ]

    if (userRole === 'admin' || userRole === 'sales') {
      return [
        ...baseCards,
        {
          id: 'total-workers',
          title: 'Total Workers',
          value: data.totalWorkers,
          icon: Users,
          description: `${data.activeWorkers} active`,
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          change: '+3%',
          trend: 'up' as const
        },
        {
          id: 'total-clients',
          title: 'Clients',
          value: data.totalClients,
          icon: Building2,
          description: 'Total clients',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          change: '+8%',
          trend: 'up' as const
        },
        {
          id: 'total-revenue',
          title: 'Revenue',
          value: data.totalRevenue,
          icon: DollarSign,
          description: 'Total earned',
          color: 'text-success',
          bgColor: 'bg-success/10',
          change: '+25%',
          trend: 'up' as const,
          prefix: '$',
          format: 'currency'
        }
      ]
    }

    return baseCards
  }

  const cards = getCardsForRole()

  const formatValue = (value: number, format?: string, prefix?: string) => {
    if (format === 'currency') {
      return value.toLocaleString()
    }
    return `${prefix || ''}${value}`
  }

  const getQuickActions = () => {
    if (userRole === 'admin' || userRole === 'sales') {
      return [
        { label: 'New Job', href: '/dashboard/jobs/new', icon: Calendar },
        { label: 'Add Worker', href: '/dashboard/workers/new', icon: Users },
        { label: 'New Client', href: '/dashboard/clients/new', icon: Building2 },
        { label: 'Create Crew', href: '/dashboard/crews/new', icon: Users }
      ]
    }
    
    if (userRole === 'worker') {
      return [
        { label: 'My Schedule', href: '/dashboard/schedule', icon: Calendar },
        { label: 'Time Tracking', href: '/dashboard/timesheet', icon: Clock }
      ]
    }

    return []
  }

  const quickActions = getQuickActions()

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.id} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`h-8 w-8 rounded-lg ${card.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {card.format === 'currency' ? (
                    <>
                      {card.prefix}
                      <AnimatedCounter value={card.value} />
                    </>
                  ) : (
                    <AnimatedCounter value={card.value} />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className={`h-3 w-3 ${
                      card.trend === 'up' ? 'text-success rotate-0' : 'text-destructive rotate-180'
                    }`} />
                    <span className={`text-xs font-medium ${
                      card.trend === 'up' ? 'text-success' : 'text-destructive'
                    }`}>
                      {card.change}
                    </span>
                  </div>
                </div>
              </CardContent>
              
              {/* Gradient overlay for visual appeal */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/5 pointer-events-none" />
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start space-x-2 h-12 btn-hover-safe group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{action.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role-specific information card */}
      {userRole === 'worker' && (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Worker Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  View your assigned jobs, track time, and manage your schedule.
                </p>
              </div>
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 