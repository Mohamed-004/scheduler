import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Clock, CheckCircle, AlertTriangle, Search, Filter } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PENDING':
      return <Clock className="h-4 w-4" />
    case 'SCHEDULED':
      return <Calendar className="h-4 w-4" />
    case 'IN_PROGRESS':
      return <AlertTriangle className="h-4 w-4" />
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-warning/10 text-warning border-warning/20'
    case 'SCHEDULED':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'IN_PROGRESS':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 'COMPLETED':
      return 'bg-success/10 text-success border-success/20'
    case 'CANCELLED':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export default async function JobsPage() {
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

  if (!userProfile) {
    redirect('/dashboard')
  }

  let jobs: any[] = []
  let jobsError: any = null

  // Fetch jobs data based on user role
  if (userProfile.role === 'worker') {
    // First, find the worker record for this user
    const { data: workerRecord } = await supabase
      .from('workers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (workerRecord) {
      // Then find their crew memberships
      const { data: workerCrews } = await supabase
        .from('crew_workers')
        .select('crew_id')
        .eq('worker_id', workerRecord.id)

      if (workerCrews && workerCrews.length > 0) {
        const crewIds = workerCrews.map(cw => cw.crew_id)
        const { data: jobsData, error: jobsErr } = await supabase
          .from('jobs')
          .select(`
            id,
            job_type,
            status,
            estimated_hours,
            quote_amount,
            start,
            finish,
            address,
            created_at,
            client:clients(name),
            crew:crews(name)
          `)
          .in('crew_id', crewIds)
          .order('created_at', { ascending: false })
        
        jobs = jobsData || []
        jobsError = jobsErr
      }
      // If worker has no crews, jobs array remains empty (which is correct)
    }
  } else {
    // Admin and sales can see all jobs
    const { data: jobsData, error: jobsErr } = await supabase
      .from('jobs')
      .select(`
        id,
        job_type,
        status,
        estimated_hours,
        quote_amount,
        start,
        finish,
        address,
        created_at,
        client:clients(name),
        crew:crews(name)
      `)
      .order('created_at', { ascending: false })

    jobs = jobsData || []
    jobsError = jobsErr
  }

  if (jobsError) {
    console.error('Error fetching jobs:', jobsError)
  }

  // Calculate stats
  const totalJobs = jobs.length
  const pendingJobs = jobs.filter(j => j.status === 'PENDING').length
  const activeJobs = jobs.filter(j => j.status === 'SCHEDULED' || j.status === 'IN_PROGRESS').length
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Jobs & Schedule
          </h2>
          <p className="text-muted-foreground">
            Manage work orders and crew scheduling
          </p>
        </div>
        
        {(userProfile.role === 'admin' || userProfile.role === 'sales') && (
          <div className="flex items-center space-x-2">
            <Link href="/dashboard/jobs/new">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Job
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Jobs
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalJobs}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingJobs}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{completedJobs}</div>
            <p className="text-xs text-muted-foreground">
              Successfully finished
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job Schedule</CardTitle>
              <CardDescription>
                {userProfile.role === 'worker' 
                  ? 'Your assigned jobs and schedule'
                  : 'All jobs in the system'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job: any) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {getStatusIcon(job.status)}
                    </div>
                    
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground">{job.job_type}</h3>
                        <Badge className={`${getStatusColor(job.status)} border`}>
                          {job.status.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <strong>Client:</strong> {job.client?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Address:</strong> {job.address}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{job.estimated_hours}h estimated</span>
                          <span>•</span>
                          <span>${job.quote_amount.toLocaleString()}</span>
                          {job.crew?.name && (
                            <>
                              <span>•</span>
                              <span>Crew: {job.crew.name}</span>
                            </>
                          )}
                          {job.start && (
                            <>
                              <span>•</span>
                              <span>Start: {new Date(job.start).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link href={`/dashboard/jobs/${job.id}`}>
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
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No jobs found
              </h3>
              <p className="text-muted-foreground mb-4">
                {userProfile.role === 'worker' 
                  ? 'No jobs have been assigned to your crews yet'
                  : 'Get started by creating your first job'
                }
              </p>
              {(userProfile.role === 'admin' || userProfile.role === 'sales') && (
                <Link href="/dashboard/jobs/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Job
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 