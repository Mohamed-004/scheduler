import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Search, Filter, Wrench } from 'lucide-react'
import { Input } from "@/components/ui/input"
import Link from 'next/link'

export default async function CrewsPage() {
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

  // Check if user has permission to view crews
  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'sales')) {
    redirect('/dashboard')
  }

  // Fetch crews data with worker count
  const { data: crews, error: crewsError } = await supabase
    .from('crews')
    .select(`
      id,
      name,
      description,
      is_active,
      created_at,
      crew_workers(
        worker_id,
        worker:workers(
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (crewsError) {
    console.error('Error fetching crews:', crewsError)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Crews
          </h2>
          <p className="text-muted-foreground">
            Manage crew teams and their member assignments
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/crews/new">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Crew
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Crews
            </CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {crews?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Created in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Crews
            </CardTitle>
            <Wrench className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {crews?.filter(c => c.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {crews?.reduce((sum, c) => sum + (c.crew_workers?.length || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all crews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Crew Directory</CardTitle>
              <CardDescription>
                View and manage all crew teams
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crews..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Crews List */}
          {crews && crews.length > 0 ? (
            <div className="space-y-4">
              {crews.map((crew: any) => (
                <div
                  key={crew.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground">{crew.name}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          crew.is_active 
                            ? 'bg-success/10 text-success border border-success/20' 
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {crew.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{crew.crew_workers?.length || 0} members</span>
                        {crew.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-md">{crew.description}</span>
                          </>
                        )}
                      </div>
                      {crew.crew_workers && crew.crew_workers.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-muted-foreground">Members:</span>
                          {crew.crew_workers.slice(0, 3).map((cw: any, index: number) => (
                            <span key={cw.worker_id} className="text-xs text-foreground">
                              {cw.worker?.name}
                              {index < Math.min(crew.crew_workers.length, 3) - 1 && ', '}
                            </span>
                          ))}
                          {crew.crew_workers.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{crew.crew_workers.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link href={`/dashboard/crews/${crew.id}`}>
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
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No crews found
              </h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first crew team
              </p>
              <Link href="/dashboard/crews/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Crew
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}