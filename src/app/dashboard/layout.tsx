import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayoutClient } from './layout-client'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/signin')
  }

  // Get user profile - should work now that RLS circular dependency is fixed
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check for pending invitations for this user's email
  let hasPendingInvitation = false
  if (userProfile?.email) {
    const { data: pendingInvitation } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('email', userProfile.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    
    hasPendingInvitation = !!pendingInvitation
  }

  return (
    <DashboardLayoutClient 
      userProfile={userProfile}
      userEmail={userProfile?.email || user?.email || ''}
      hasPendingInvitation={hasPendingInvitation}
    >
      {children}
    </DashboardLayoutClient>
  )
} 