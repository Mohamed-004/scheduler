/**
 * Worker Schedule Management Page
 * Allows setting regular weekly schedules and recurring patterns
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  Clock, 
  Calendar,
  Plus,
  Save
} from 'lucide-react'

interface WorkerSchedulePageProps {
  params: {
    id: string
  }
}

export default async function WorkerSchedulePage({ params }: WorkerSchedulePageProps) {
  const supabase = await createClient()
  const { id } = await params
  
  // Get worker details
  const { data: worker, error } = await supabase
    .from('workers')
    .select(`
      *,
      user:users(id, email, role, tz)
    `)
    .eq('id', id)
    .single()

  if (error || !worker) {
    notFound()
  }

  // Sample schedule data - in a real app, this would come from the database
  const weeklySchedule = {
    monday: { working: true, start: '08:00', end: '17:00', break: 60 },
    tuesday: { working: true, start: '08:00', end: '17:00', break: 60 },
    wednesday: { working: true, start: '08:00', end: '17:00', break: 60 },
    thursday: { working: true, start: '08:00', end: '17:00', break: 60 },
    friday: { working: true, start: '08:00', end: '17:00', break: 60 },
    saturday: { working: false, start: '', end: '', break: 0 },
    sunday: { working: false, start: '', end: '', break: 0 }
  }

  const totalWeeklyHours = Object.values(weeklySchedule).reduce((total, day) => {
    if (day.working && day.start && day.end) {
      const startTime = new Date(`2000-01-01T${day.start}:00`)
      const endTime = new Date(`2000-01-01T${day.end}:00`)
      const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      const breakHours = day.break / 60
      return total + (workHours - breakHours)
    }
    return total
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/workers/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Worker
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Schedule Management</h1>
            <p className="text-muted-foreground">{worker.name} - Weekly Schedule</p>
          </div>
        </div>
        
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Schedule Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <CardDescription>Apply common schedule patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Full Time (40h)
            </Button>
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Part Time (20h)
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Weekend Only
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Flexible
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Configure regular working hours for each day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(weeklySchedule).map(([day, schedule]) => (
              <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-24">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={schedule.working}
                      className="rounded"
                    />
                    <Label className="capitalize font-medium">{day}</Label>
                  </div>
                </div>
                
                {schedule.working ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`${day}-start`} className="text-sm">Start:</Label>
                      <Input
                        id={`${day}-start`}
                        type="time"
                        value={schedule.start}
                        className="w-32"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`${day}-end`} className="text-sm">End:</Label>
                      <Input
                        id={`${day}-end`}
                        type="time"
                        value={schedule.end}
                        className="w-32"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`${day}-break`} className="text-sm">Break (min):</Label>
                      <Input
                        id={`${day}-break`}
                        type="number"
                        value={schedule.break}
                        className="w-24"
                        min="0"
                        max="480"
                        step="15"
                      />
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        if (schedule.start && schedule.end) {
                          const startTime = new Date(`2000-01-01T${schedule.start}:00`)
                          const endTime = new Date(`2000-01-01T${schedule.end}:00`)
                          const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
                          const breakHours = schedule.break / 60
                          const netHours = workHours - breakHours
                          return `${netHours}h net`
                        }
                        return '0h'
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Day off</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Summary</CardTitle>
          <CardDescription>Overview of weekly working hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalWeeklyHours}h</div>
              <div className="text-sm text-muted-foreground">Total Weekly Hours</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(weeklySchedule).filter(day => day.working).length}
              </div>
              <div className="text-sm text-muted-foreground">Working Days</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(totalWeeklyHours / Object.values(weeklySchedule).filter(day => day.working).length * 10) / 10 || 0}h
              </div>
              <div className="text-sm text-muted-foreground">Avg. Daily Hours</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 