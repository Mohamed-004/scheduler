'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { JobWizard } from '@/components/jobs/job-wizard'

export default function NewJobPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<{ team_id: string; role: string } | null>(null)
  const [isCheckingRole, setIsCheckingRole] = useState(true)

  // Role check and redirect
  useEffect(() => {
    const checkUserRole = async () => {
      const supabase = createClient()
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/auth/signin')
          return
        }

        const { data: userProfileData } = await supabase
          .from('users')
          .select('role, team_id')
          .eq('id', user.id)
          .single()

        if (!userProfileData) {
          router.push('/dashboard')
          return
        }

        // Only admin and sales can create jobs
        if (!['admin', 'sales'].includes(userProfileData.role)) {
          router.push('/dashboard/jobs')
          return
        }

        setUserProfile(userProfileData)
        setIsCheckingRole(false)
      } catch (error) {
        router.push('/dashboard')
      }
    }
    
    checkUserRole()
  }, [router])

  // Show loading while checking role
  if (isCheckingRole) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="text-muted-foreground">Checking permissions...</span>
        </div>
      </div>
    )
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
            Follow the steps below to create a new work order
          </p>
        </div>
      </div>

      {/* Use the new wizard component */}
      {userProfile && <JobWizard userProfile={userProfile} />}
    </div>
  )
}
