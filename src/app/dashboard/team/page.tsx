import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, UserCheck, UserX, Settings, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default async function TeamPage() {
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

  console.log('Team page - User profile:', userProfile)

  if (!userProfile) {
    redirect('/auth/setup')
  }

  // Only allow admin and sales to access team management
  if (!['admin', 'sales'].includes(userProfile.role)) {
    redirect('/dashboard')
  }

  // Get all team members - try different approaches
  console.log('Team page - Current user profile:', userProfile)
  
  // First try: Get users with explicit error logging
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  console.log('Team page - Users query result:', {
    data: allUsers,
    error: usersError,
    count: allUsers?.length
  })

  // Second try: Get workers with explicit error logging  
  const { data: allWorkers, error: workersError } = await supabase
    .from('workers')
    .select('*')

  console.log('Team page - Workers query result:', {
    data: allWorkers,
    error: workersError,
    count: allWorkers?.length
  })

  // Combine the data manually with type safety
  const teamMembers = (allUsers || []).map((user: any) => ({
    ...user,
    workers: (allWorkers || []).filter((worker: any) => worker.user_id === user.id)
  }))

  console.log('Team page - Final team members:', {
    teamMembers,
    totalCount: teamMembers.length,
    usersCount: allUsers?.length || 0,
    workersCount: allWorkers?.length || 0
  })

  // Get invitation history (both pending and accepted) - FIXED: Use team_invitations table
  const { data: invitationHistory, error: invitationError } = await supabase
    .from('team_invitations')
    .select(`
      id,
      email,
      role,
      name,
      status,
      created_at,
      expires_at,
      accepted_at,
      invited_by,
      token,
      team_id,
      inviter:users!invited_by(email, name)
    `)
    .eq('team_id', userProfile.team_id)
    .order('created_at', { ascending: false })

  console.log('Team page - Invitation history:', {
    data: invitationHistory,
    error: invitationError,
    count: invitationHistory?.length || 0,
    teamId: userProfile.team_id
  })

  // Filter invitations by status for display
  const pendingInvitations = invitationHistory?.filter(inv => inv.status === 'pending') || []
  const acceptedInvitations = invitationHistory?.filter(inv => inv.status === 'accepted') || []

  const canManageTeam = ['admin', 'sales'].includes(userProfile.role)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage your team members and send invitations
          </p>
        </div>
        {canManageTeam && (
          <Link href="/dashboard/team/invite">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite Team Member
            </Button>
          </Link>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{teamMembers?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{pendingInvitations.length}</p>
                <p className="text-xs text-muted-foreground">Pending Invitations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{acceptedInvitations.length}</p>
                <p className="text-xs text-muted-foreground">Accepted Invitations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{allWorkers?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Workers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Team Members ({teamMembers?.length || 0})
          </CardTitle>
          <CardDescription>
            Current active team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers && teamMembers.length > 0 ? (
            <div className="space-y-4">
              {teamMembers.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.workers?.[0]?.name || member.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Member since {new Date(member.created_at).toLocaleDateString()}
                        {member.workers?.[0]?.rating && ` • Rating: ${member.workers[0].rating}/5`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      member.role === 'admin' ? 'default' : 
                      member.role === 'sales' ? 'secondary' : 
                      'outline'
                    }>
                      {member.role}
                    </Badge>
                    {canManageTeam && member.id !== userProfile.id && (
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No team members found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invitation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitation History ({invitationHistory?.length || 0})
          </CardTitle>
          <CardDescription>
            All invitations sent to team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationHistory && invitationHistory.length > 0 ? (
            <div className="space-y-4">
              {invitationHistory.map((invitation: any) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      invitation.status === 'accepted' ? 'bg-green-100' :
                      invitation.status === 'pending' ? 'bg-orange-100' :
                      'bg-gray-100'
                    }`}>
                      {invitation.status === 'accepted' ? (
                        <UserCheck className={`h-5 w-5 ${
                          invitation.status === 'accepted' ? 'text-green-600' :
                          invitation.status === 'pending' ? 'text-orange-600' :
                          'text-gray-600'
                        }`} />
                      ) : invitation.status === 'pending' ? (
                        <Mail className="h-5 w-5 text-orange-600" />
                      ) : (
                        <UserX className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {invitation.name && `${invitation.name} • `}
                        Invited {new Date(invitation.created_at).toLocaleDateString()}
                        {invitation.accepted_at && ` • Accepted ${new Date(invitation.accepted_at).toLocaleDateString()}`}
                        {invitation.status === 'pending' && ` • Expires ${new Date(invitation.expires_at).toLocaleDateString()}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Role: {invitation.role} • 
                        Invited by: {invitation.inviter?.email || invitation.inviter?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      invitation.status === 'accepted' ? 'default' :
                      invitation.status === 'pending' ? 'secondary' :
                      'outline'
                    }>
                      {invitation.status}
                    </Badge>
                    <Badge variant="outline">
                      {invitation.role}
                    </Badge>
                    {canManageTeam && invitation.status === 'pending' && (
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No invitations sent yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 