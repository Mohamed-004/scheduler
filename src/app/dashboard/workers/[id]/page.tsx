/**
 * Worker Detail Page
 * Manages worker schedules, availability, and special exceptions
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Star,
  MapPin,
  Settings
} from 'lucide-react'

interface WorkerDetailPageProps {
  params: {
    id: string
  }
}

export default async function WorkerDetailPage({ params }: WorkerDetailPageProps) {
  const supabase = await createClient()
  const { id } = await params
  
  // Get worker details with user information
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/workers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workers
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{worker.name}</h1>
            <p className="text-muted-foreground">{worker.user?.email}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={worker.is_active ? "default" : "secondary"}>
            {worker.is_active ? "Active" : "Inactive"}
          </Badge>
          <Link href={`/dashboard/workers/${id}/schedule`}>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Manage Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Worker Information */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Worker Information</CardTitle>
            <CardDescription>Basic worker details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Name:</span>
              </div>
              <p className="text-sm pl-6 font-medium">{worker.name}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Phone:</span>
              </div>
              <p className="text-sm pl-6">
                {worker.phone ? (
                  <a href={`tel:${worker.phone}`} className="text-blue-600 hover:underline">
                    {worker.phone}
                  </a>
                ) : (
                  'Not provided'
                )}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Rating:</span>
              </div>
              <p className="text-sm pl-6">
                {worker.rating ? `${worker.rating}/5.0` : 'No rating yet'}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Weekly Hours:</span>
              </div>
              <p className="text-sm pl-6">{worker.weekly_hours || 0} hours</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>User account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email:</span>
              </div>
              <p className="text-sm pl-6">{worker.user?.email}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Role:</span>
              </div>
              <p className="text-sm pl-6 capitalize">{worker.user?.role}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Joined:</span>
              </div>
              <p className="text-sm pl-6">
                {new Date(worker.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage worker schedules and availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href={`/dashboard/workers/${id}/schedule`}>
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Schedule
                </Button>
              </Link>
              
              <Link href={`/dashboard/workers/${id}/availability`}>
                <Button variant="outline" className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  Set Availability
                </Button>
              </Link>
              
              <Link href={`/dashboard/workers/${id}/exceptions`}>
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Special Exceptions
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule & Availability Management</CardTitle>
          <CardDescription>
            Manage this worker's regular schedule, availability windows, and special exceptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Regular Schedule</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Set weekly recurring work hours and patterns
              </p>
              <Link href={`/dashboard/workers/${id}/schedule`}>
                <Button size="sm" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Schedule
                </Button>
              </Link>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Availability Windows</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Define when this worker is available for assignments
              </p>
              <Link href={`/dashboard/workers/${id}/availability`}>
                <Button size="sm" variant="outline" className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  Set Availability
                </Button>
              </Link>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Special Exceptions</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Handle time off, holidays, and special circumstances
              </p>
              <Link href={`/dashboard/workers/${id}/exceptions`}>
                <Button size="sm" variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Exceptions
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 