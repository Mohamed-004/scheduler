import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Search, Filter, Star, Clock, Mail, Phone, ChevronRight, MapPin, Award } from 'lucide-react'
import { Input } from "@/components/ui/input"
import Link from 'next/link'

export default async function WorkersPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/signin')
  }

  // Get user profile for role checking
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if user has permission to view workers
  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'sales')) {
    redirect('/dashboard')
  }

  // Fetch workers data
  const { data: workers, error: workersError } = await supabase
    .from('workers')
    .select(`
      id,
      name,
      phone,
      rating,
      weekly_hours,
      is_active,
      created_at,
      user:users(email)
    `)
    .order('created_at', { ascending: false })

  if (workersError) {
    console.error('Error fetching workers:', workersError)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Workers
          </h2>
          <p className="text-muted-foreground">
            Manage your crew members and their assignments
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/workers/new">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Worker
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Workers
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {workers?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Registered in system
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Workers
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {workers?.filter(w => w.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Available for scheduling
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50/50 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Star className="h-4 w-4 text-yellow-600 fill-current" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground flex items-center">
              {workers && workers.length > 0 
                ? (workers.reduce((sum, w) => sum + w.rating, 0) / workers.length).toFixed(1)
                : '0.0'
              }
              <Star className="h-4 w-4 text-yellow-500 fill-current ml-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              Out of 5.0 stars
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Worker Directory</CardTitle>
              <CardDescription>
                View and manage all registered workers
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workers..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Workers Grid */}
          {workers && workers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workers.map((worker: any) => (
                <Link key={worker.id} href={`/dashboard/workers/${worker.id}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/20 cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                              <span className="text-lg font-semibold text-primary">
                                {worker.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${
                              worker.is_active ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {worker.name}
                            </h3>
                            <div className="flex items-center space-x-1 mt-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium text-muted-foreground">
                                {worker.rating}/5
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Contact Info */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground truncate">
                            {worker.user?.email || 'No email'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {worker.phone || 'No phone'}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {worker.weekly_hours}h/week
                          </span>
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          worker.is_active 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}>
                          {worker.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>

                      {/* Member Since */}
                      <div className="text-xs text-muted-foreground">
                        Member since {new Date(worker.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No workers found
              </h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first worker to the system
              </p>
              <Link href="/dashboard/workers/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Worker
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 