/**
 * Worker Availability Management Page
 * Manages when workers are available for job assignments
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
  Save,
  Edit,
  Trash2
} from 'lucide-react'

interface WorkerAvailabilityPageProps {
  params: {
    id: string
  }
}

export default async function WorkerAvailabilityPage({ params }: WorkerAvailabilityPageProps) {
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

  // Sample availability data - in a real app, this would come from the database
  const availabilityWindows = [
    {
      id: 1,
      type: 'recurring',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      start_time: '08:00',
      end_time: '18:00',
      status: 'active'
    },
    {
      id: 2,
      type: 'on-call',
      days: ['saturday'],
      start_time: '10:00',
      end_time: '16:00',
      status: 'active'
    }
  ]

  const formatDays = (days: string[]) => {
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')
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
            <h1 className="text-2xl font-bold">Availability Management</h1>
            <p className="text-muted-foreground">{worker.name} - Availability Windows</p>
          </div>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Availability
        </Button>
      </div>

      {/* Availability Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <CardDescription>Apply common availability patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Business Hours
            </Button>
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Extended Hours
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Weekend Only
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              On-Call
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Availability Windows */}
      <Card>
        <CardHeader>
          <CardTitle>Current Availability Windows</CardTitle>
          <CardDescription>Manage when this worker is available for assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availabilityWindows.map((window) => (
              <div key={window.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant={window.type === 'recurring' ? "default" : "secondary"}>
                      {window.type}
                    </Badge>
                    <Badge variant={window.status === 'active' ? "default" : "secondary"}>
                      {window.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-medium">
                      {formatDays(window.days)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {window.start_time} - {window.end_time}
                    </p>
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

      {/* Add New Availability Window */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Availability Window</CardTitle>
          <CardDescription>Define when this worker is available for work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Availability Type</Label>
              <select className="w-full px-3 py-2 border rounded-md">
                <option value="recurring">Recurring</option>
                <option value="on-call">On-Call</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="w-full px-3 py-2 border rounded-md">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="grid grid-cols-7 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <input type="checkbox" id={day.toLowerCase()} className="rounded" />
                  <Label htmlFor={day.toLowerCase()} className="text-sm">
                    {day.slice(0, 3)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                defaultValue="08:00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                defaultValue="18:00"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Availability Window
            </Button>
            <Button variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Availability Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Availability Summary</CardTitle>
          <CardDescription>Overview of worker availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {availabilityWindows.filter(w => w.status === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active Windows</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {availabilityWindows.filter(w => w.type === 'recurring').length}
              </div>
              <div className="text-sm text-muted-foreground">Recurring</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {availabilityWindows.filter(w => w.type === 'on-call').length}
              </div>
              <div className="text-sm text-muted-foreground">On-Call</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 