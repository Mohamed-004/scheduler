/**
 * Worker Special Exceptions Management Page
 * Handles time off, holidays, and special circumstances
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
  Calendar, 
  Clock,
  Plus,
  Save,
  Edit,
  Trash2,
  Plane,
  Heart,
  User,
  Gift,
  AlertTriangle
} from 'lucide-react'

interface WorkerExceptionsPageProps {
  params: {
    id: string
  }
}

export default async function WorkerExceptionsPage({ params }: WorkerExceptionsPageProps) {
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

  // Sample exceptions data - in a real app, this would come from the database
  const exceptions = [
    {
      id: 1,
      type: 'vacation',
      title: 'Summer Vacation',
      start_date: '2024-07-15',
      end_date: '2024-07-22',
      is_full_day: true,
      status: 'approved',
      notes: 'Family vacation to Europe'
    },
    {
      id: 2,
      type: 'sick',
      title: 'Sick Leave',
      start_date: '2024-03-10',
      end_date: '2024-03-10',
      is_full_day: false,
      start_time: '09:00',
      end_time: '13:00',
      status: 'approved',
      notes: 'Doctor appointment'
    },
    {
      id: 3,
      type: 'holiday',
      title: 'Christmas Day',
      start_date: '2024-12-25',
      end_date: '2024-12-25',
      is_full_day: true,
      status: 'pending',
      notes: 'Public holiday'
    }
  ]

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case 'vacation': return <Plane className="h-4 w-4" />
      case 'sick': return <Heart className="h-4 w-4" />
      case 'personal': return <User className="h-4 w-4" />
      case 'holiday': return <Gift className="h-4 w-4" />
      case 'emergency': return <AlertTriangle className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default'
      case 'pending': return 'secondary'
      case 'rejected': return 'destructive'
      default: return 'outline'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

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
            <h1 className="text-2xl font-bold">Special Exceptions</h1>
            <p className="text-muted-foreground">{worker.name} - Time Off & Holidays</p>
          </div>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Exception
        </Button>
      </div>

      {/* Current Exceptions */}
      <Card>
        <CardHeader>
          <CardTitle>Current & Upcoming Exceptions</CardTitle>
          <CardDescription>Manage time off requests, holidays, and special circumstances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exceptions.map((exception) => (
              <div key={exception.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-muted rounded-lg">
                    {getExceptionIcon(exception.type)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{exception.title}</h3>
                      <Badge variant={getStatusColor(exception.status) as any}>
                        {exception.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {exception.type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDate(exception.start_date)}
                          {exception.end_date !== exception.start_date && 
                            ` - ${formatDate(exception.end_date)}`
                          }
                        </span>
                      </div>
                      
                      {!exception.is_full_day && exception.start_time && exception.end_time && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{exception.start_time} - {exception.end_time}</span>
                        </div>
                      )}
                      
                                             <Badge variant="outline">
                         {exception.is_full_day ? 'Full Day' : 'Partial Day'}
                       </Badge>
                    </div>
                    
                    {exception.notes && (
                      <p className="text-sm text-muted-foreground">{exception.notes}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add New Exception */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Exception</CardTitle>
          <CardDescription>Create a new time off request or special exception</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exception-type">Exception Type</Label>
              <select id="exception-type" className="w-full px-3 py-2 border rounded-md">
                <option value="vacation">Vacation</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal</option>
                <option value="holiday">Holiday</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exception-title">Title</Label>
              <Input
                id="exception-title"
                placeholder="e.g., Summer Vacation"
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="full-day" className="rounded" />
              <Label htmlFor="full-day">Full day exception</Label>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time (if partial day)</Label>
              <Input
                id="start-time"
                type="time"
                disabled
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time (if partial day)</Label>
              <Input
                id="end-time"
                type="time"
                disabled
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              rows={3}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Additional details or reason for exception..."
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Exception
            </Button>
            <Button variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exception Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Exception Summary</CardTitle>
          <CardDescription>Overview of time off and exceptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {exceptions.filter(e => e.status === 'approved').length}
              </div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {exceptions.filter(e => e.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {exceptions.filter(e => e.type === 'vacation').length}
              </div>
              <div className="text-sm text-muted-foreground">Vacation Days</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {exceptions.filter(e => e.type === 'sick').length}
              </div>
              <div className="text-sm text-muted-foreground">Sick Days</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 