'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react'
import { checkWorkerAvailability } from '@/lib/worker-availability'

interface AvailabilityCalendarProps {
  selectedDate?: Date
  onDateSelect: (date: Date) => void
  workerIds?: string[]
  timeSlot?: { start: Date; end: Date }
  teamId: string
}

interface DayAvailability {
  date: Date
  available_workers: number
  total_workers: number
  conflicts: string[]
  status: 'available' | 'partial' | 'unavailable' | 'unknown'
}

export function AvailabilityCalendar({ 
  selectedDate, 
  onDateSelect, 
  workerIds = [], 
  timeSlot,
  teamId 
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availability, setAvailability] = useState<Map<string, DayAvailability>>(new Map())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (workerIds.length > 0) {
      checkMonthAvailability()
    }
  }, [currentMonth, workerIds])

  const checkMonthAvailability = async () => {
    if (workerIds.length === 0) return
    
    setIsLoading(true)
    const newAvailability = new Map<string, DayAvailability>()
    
    // Get all days in current month
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateKey = date.toISOString().split('T')[0]
      
      // Skip past dates
      if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
        newAvailability.set(dateKey, {
          date,
          available_workers: 0,
          total_workers: workerIds.length,
          conflicts: ['Past date'],
          status: 'unavailable'
        })
        continue
      }

      let availableCount = 0
      const allConflicts: string[] = []

      // Check each worker's availability for this day
      for (const workerId of workerIds) {
        try {
          const dayTimeSlot = {
            start: new Date(year, month, day, 9, 0), // Default 9 AM
            end: new Date(year, month, day, 17, 0)   // Default 5 PM
          }

          const result = await checkWorkerAvailability(workerId, dayTimeSlot)
          
          if (result.available) {
            availableCount++
          } else {
            allConflicts.push(...result.conflicts)
          }
        } catch (error) {
          console.error('Error checking availability for worker:', workerId, error)
        }
      }

      // Determine status
      let status: DayAvailability['status'] = 'unknown'
      if (availableCount === workerIds.length) {
        status = 'available'
      } else if (availableCount > 0) {
        status = 'partial'
      } else {
        status = 'unavailable'
      }

      newAvailability.set(dateKey, {
        date,
        available_workers: availableCount,
        total_workers: workerIds.length,
        conflicts: [...new Set(allConflicts)], // Remove duplicates
        status
      })
    }

    setAvailability(newAvailability)
    setIsLoading(false)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const getDayStatus = (date: Date): DayAvailability | null => {
    const dateKey = date.toISOString().split('T')[0]
    return availability.get(dateKey) || null
  }

  const getStatusColor = (status: DayAvailability['status']) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200'
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'unavailable': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getStatusIcon = (status: DayAvailability['status']) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-3 w-3" />
      case 'partial': return <AlertCircle className="h-3 w-3" />
      case 'unavailable': return <AlertCircle className="h-3 w-3" />
      default: return null
    }
  }

  // Generate calendar days
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const calendarDays: (Date | null)[] = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day))
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Availability Calendar
            </CardTitle>
            <CardDescription>
              {workerIds.length > 0 
                ? `Worker availability for ${workerIds.length} selected worker${workerIds.length !== 1 ? 's' : ''}`
                : 'Select workers to see availability'
              }
            </CardDescription>
          </div>
          
          {workerIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {monthNames[month]} {year}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {workerIds.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Workers Selected</h3>
            <p className="text-muted-foreground">
              Worker assignments will show availability here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                <span>Partial</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>Unavailable</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {dayNames.map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={index} className="p-2"></div>
                }

                const dayAvailability = getDayStatus(date)
                const isSelected = selectedDate && 
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear()
                
                const isToday = date.toDateString() === new Date().toDateString()

                return (
                  <button
                    key={index}
                    onClick={() => onDateSelect(date)}
                    disabled={isLoading || !dayAvailability || dayAvailability.status === 'unavailable'}
                    className={`
                      p-2 text-xs rounded border transition-all hover:shadow-sm
                      ${isSelected 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'border-border hover:border-primary/50'
                      }
                      ${isToday ? 'font-bold' : ''}
                      ${dayAvailability ? getStatusColor(dayAvailability.status) : 'bg-gray-50'}
                      ${dayAvailability?.status === 'unavailable' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <span>{date.getDate()}</span>
                      {dayAvailability && (
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(dayAvailability.status)}
                          <span className="text-[10px]">
                            {dayAvailability.available_workers}/{dayAvailability.total_workers}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Selected date details */}
            {selectedDate && (() => {
              const dayAvailability = getDayStatus(selectedDate)
              return dayAvailability && (
                <div className="p-3 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm mb-2">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{dayAvailability.available_workers} of {dayAvailability.total_workers} workers available</span>
                    </div>
                    <Badge className={getStatusColor(dayAvailability.status)}>
                      {dayAvailability.status}
                    </Badge>
                  </div>
                  {dayAvailability.conflicts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Conflicts:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {dayAvailability.conflicts.slice(0, 3).map((conflict, i) => (
                          <li key={i}>• {conflict}</li>
                        ))}
                        {dayAvailability.conflicts.length > 3 && (
                          <li>• +{dayAvailability.conflicts.length - 3} more conflicts</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}