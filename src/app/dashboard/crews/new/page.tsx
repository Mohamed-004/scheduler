import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CrewForm } from '@/components/crews/crew-form'

export default async function NewCrewPage() {
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

  // Check if user has permission to create crews
  if (!userProfile || !['admin', 'sales'].includes(userProfile.role)) {
    redirect('/dashboard')
  }

  // Fetch available workers for the team
  const { data: workers } = await supabase
    .from('workers')
    .select(`
      id,
      name,
      phone,
      rating,
      is_active,
      user:users(
        id,
        email,
        role
      )
    `)
    .eq('user.team_id', userProfile.team_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Fetch available job roles for role capabilities
  const { data: jobRoles } = await supabase
    .from('job_roles')
    .select('*')
    .eq('team_id', userProfile.team_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/crews">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Crews
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Create New Crew
          </h2>
          <p className="text-muted-foreground">
            Set up a new crew team with assigned workers
          </p>
        </div>
      </div>

      {/* Crew Form */}
      <CrewForm
        availableWorkers={workers || []}
        availableRoles={jobRoles || []}
        userRole={userProfile.role}
      />
    </div>
  )
}