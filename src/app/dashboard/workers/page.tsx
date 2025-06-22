import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Search, Filter } from 'lucide-react'
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Workers
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {workers?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Workers
            </CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {workers?.filter(w => w.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for scheduling
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {workers && workers.length > 0 
                ? (workers.reduce((sum, w) => sum + w.rating, 0) / workers.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
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

          {/* Workers List */}
          {workers && workers.length > 0 ? (
            <div className="space-y-4">
              {workers.map((worker: any) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {worker.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground">{worker.name}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          worker.is_active 
                            ? 'bg-success/10 text-success border border-success/20' 
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {worker.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{worker.phone}</span>
                        <span>•</span>
                        <span>{worker.user?.email || 'No email'}</span>
                        <span>•</span>
                        <span>⭐ {worker.rating}/5</span>
                        <span>•</span>
                        <span>{worker.weekly_hours}h/week</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link href={`/dashboard/workers/${worker.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
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