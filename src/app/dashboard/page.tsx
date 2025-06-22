import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PendingInvitationAlert } from '@/components/dashboard/pending-invitation-alert'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/signin')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/auth/setup')
  }

  // Check for pending invitations for this user's email with inviter information
  const { data: pendingInvitation } = await supabase
    .from('invitations')
    .select(`
      *,
      inviter:users!invited_by(email)
    `)
    .eq('email', userProfile.email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  console.log('Dashboard - User profile:', userProfile)
  console.log('Dashboard - Pending invitation:', pendingInvitation)

  return (
    <div className="space-y-6">
      {/* Pending Invitation Alert */}
      {pendingInvitation && (
        <PendingInvitationAlert 
          invitation={pendingInvitation} 
          currentRole={userProfile.role}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your crew.
          </p>
        </div>
      </div>

      <DashboardContent userRole={userProfile.role} />
    </div>
  )
} 