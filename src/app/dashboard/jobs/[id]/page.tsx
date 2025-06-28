/**
 * Job Detail Page
 * Displays comprehensive job information with edit and status update capabilities
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getJob } from '@/app/actions/jobs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  MapPin, 
  User, 
  Users, 
  DollarSign, 
  Clock,
  FileText,
  Phone,
  Mail
} from 'lucide-react'

interface JobDetailPageProps {
  params: {
    id: string
  }
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const result = await getJob(params.id)

  if (!result.success) {
    notFound()
  }

  const { job } = result

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled'
    return new Date(dateString).toLocaleString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/jobs">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{job.job_type}</h1>
            <p className="text-muted-foreground">Job #{job.id.slice(0, 8)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(job.status)}>
            {job.status}
          </Badge>
          <Link href={`/dashboard/jobs/${job.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Job Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
            <CardDescription>Details about this job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Address:</span>
                </div>
                <p className="text-sm pl-6">{job.address}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Job Type:</span>
                </div>
                <p className="text-sm pl-6">{job.job_type}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Estimated Hours:</span>
                </div>
                <p className="text-sm pl-6">{job.estimated_hours} hours</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Quote Amount:</span>
                </div>
                <p className="text-sm pl-6 font-semibold text-green-600">
                  {formatCurrency(job.quote_amount)}
                </p>
              </div>
            </div>

            {job.notes && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Notes:</span>
                </div>
                <p className="text-sm pl-6 text-muted-foreground">{job.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Job timing information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Start:</span>
              </div>
              <p className="text-sm pl-6">{formatDate(job.start)}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Finish:</span>
              </div>
              <p className="text-sm pl-6">{formatDate(job.finish)}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Created:</span>
              </div>
              <p className="text-sm pl-6">
                {new Date(job.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        {job.client && (
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
              <CardDescription>Client contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Name:</span>
                </div>
                <p className="text-sm pl-6 font-medium">{job.client.name}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                </div>
                <p className="text-sm pl-6">
                  <a href={`tel:${job.client.phone}`} className="text-blue-600 hover:underline">
                    {job.client.phone}
                  </a>
                </p>
              </div>
              
              {job.client.email && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Email:</span>
                  </div>
                  <p className="text-sm pl-6">
                    <a href={`mailto:${job.client.email}`} className="text-blue-600 hover:underline">
                      {job.client.email}
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Crew Information */}
        {job.crew && (
          <Card>
            <CardHeader>
              <CardTitle>Assigned Crew</CardTitle>
              <CardDescription>Crew details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Crew Name:</span>
                </div>
                <p className="text-sm pl-6 font-medium">{job.crew.name}</p>
              </div>
              
              {job.crew.description && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Description:</span>
                  </div>
                  <p className="text-sm pl-6 text-muted-foreground">{job.crew.description}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Status:</span>
                </div>
                <div className="pl-6">
                  <Badge variant={job.crew.is_active ? "default" : "secondary"}>
                    {job.crew.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 