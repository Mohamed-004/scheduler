import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Building2, Search, Filter, Phone, Mail, MapPin } from 'lucide-react'
import { Input } from "@/components/ui/input"
import Link from 'next/link'

export default async function ClientsPage() {
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

  // Check if user has permission to view clients
  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'sales')) {
    redirect('/dashboard')
  }

  // Fetch clients data with job count
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      phone,
      email,
      address,
      tz,
      created_at,
      jobs(
        id,
        status
      )
    `)
    .order('created_at', { ascending: false })

  if (clientsError) {
    console.error('Error fetching clients:', clientsError)
  }

  // Calculate total jobs and active jobs
  const totalJobs = clients?.reduce((sum, c) => sum + (c.jobs?.length || 0), 0) || 0
  const activeJobs = clients?.reduce((sum, c) => sum + (c.jobs?.filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED').length || 0), 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Clients
          </h2>
          <p className="text-muted-foreground">
            Manage your client database and contact information
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/clients/new">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {clients?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              In your database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Jobs
            </CardTitle>
            <Building2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalJobs}
            </div>
            <p className="text-xs text-muted-foreground">
              All time jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Jobs
            </CardTitle>
            <Building2 className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {activeJobs}
            </div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Directory</CardTitle>
              <CardDescription>
                View and manage all client information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Clients List */}
          {clients && clients.length > 0 ? (
            <div className="space-y-4">
              {clients.map((client: any) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground">{client.name}</h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {client.jobs?.length || 0} jobs
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{client.phone}</span>
                        </div>
                        {client.email && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{client.email}</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {client.address && (
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-md">{client.address}</span>
                        </div>
                      )}
                      
                      {client.jobs && client.jobs.length > 0 && (
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-muted-foreground">Jobs:</span>
                          <span className="text-success">
                            {client.jobs.filter((j: any) => j.status === 'COMPLETED').length} completed
                          </span>
                          <span className="text-warning">
                            {client.jobs.filter((j: any) => j.status === 'IN_PROGRESS' || j.status === 'SCHEDULED').length} active
                          </span>
                          <span className="text-muted-foreground">
                            {client.jobs.filter((j: any) => j.status === 'PENDING').length} pending
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link href={`/dashboard/clients/${client.id}`}>
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
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No clients found
              </h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first client to the system
              </p>
              <Link href="/dashboard/clients/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Client
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}