'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, MapPin, DollarSign, Clock, Save, Users } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
}

interface Crew {
  id: string
  name: string
  description: string
  is_active: boolean
}

export default function NewJobPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    client_id: '',
    crew_id: '',
    job_type: '',
    address: '',
    estimated_hours: '',
    quote_amount: '',
    start: '',
    finish: '',
    notes: '',
    equipment_required: [] as string[]
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name')
      
      // Fetch active crews
      const { data: crewsData } = await supabase
        .from('crews')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      setClients(clientsData || [])
      setCrews(crewsData || [])
    }
    
    fetchData()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      
      // Prepare job data
      const jobData = {
        client_id: formData.client_id,
        crew_id: formData.crew_id || null,
        job_type: formData.job_type,
        address: formData.address,
        estimated_hours: parseFloat(formData.estimated_hours),
        quote_amount: parseFloat(formData.quote_amount),
        start: formData.start ? new Date(formData.start).toISOString() : null,
        finish: formData.finish ? new Date(formData.finish).toISOString() : null,
        notes: formData.notes || null,
        equipment_required: formData.equipment_required,
        status: 'PENDING' as const
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single()

      if (error) throw error

      setMessage({ type: 'success', text: 'Job created successfully!' })
      
      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard/jobs')
      }, 2000)
      
    } catch (error: any) {
      console.error('Error creating job:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to create job. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/jobs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Create New Job
          </h2>
          <p className="text-muted-foreground">
            Add a new work order to the system
          </p>
        </div>
      </div>

      {/* Job Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Job Details
          </CardTitle>
          <CardDescription>
            Enter the job information and assignment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client and Crew Selection */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="client_id">Client *</Label>
                <select
                  id="client_id"
                  value={formData.client_id}
                  onChange={(e) => handleInputChange('client_id', e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="crew_id">Assigned Crew (Optional)</Label>
                <select
                  id="crew_id"
                  value={formData.crew_id}
                  onChange={(e) => handleInputChange('crew_id', e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Assign later...</option>
                  {crews.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Job Type and Address */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="job_type">Job Type *</Label>
                <Input
                  id="job_type"
                  type="text"
                  placeholder="e.g., Lawn Maintenance, Tree Removal"
                  value={formData.job_type}
                  onChange={(e) => handleInputChange('job_type', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="address">Job Address *</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main St, City, State"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* Hours and Quote */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="estimated_hours">Estimated Hours *</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="8.0"
                  value={formData.estimated_hours}
                  onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="quote_amount">Quote Amount ($) *</Label>
                <Input
                  id="quote_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="500.00"
                  value={formData.quote_amount}
                  onChange={(e) => handleInputChange('quote_amount', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="start">Start Date & Time</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={formData.start}
                  onChange={(e) => handleInputChange('start', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="finish">End Date & Time</Label>
                <Input
                  id="finish"
                  type="datetime-local"
                  value={formData.finish}
                  onChange={(e) => handleInputChange('finish', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <textarea
                id="notes"
                rows={4}
                placeholder="Special instructions, requirements, or notes..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-success/10 text-success border border-success/20' 
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}>
                {message.text}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center space-x-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Creating Job...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Job
                  </>
                )}
              </Button>
              
              <Link href="/dashboard/jobs">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need to add a client first?</CardTitle>
            <CardDescription>
              Create a new client profile before creating this job
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/clients/new">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Add New Client
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need a new crew?</CardTitle>
            <CardDescription>
              Set up a crew before assigning this job
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/crews/new">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Create New Crew
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 