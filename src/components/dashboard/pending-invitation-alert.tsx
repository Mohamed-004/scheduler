'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Check, X, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PendingInvitationAlertProps {
  invitation: {
    id: string
    email: string
    role: string
    name?: string
    invitation_type: string
    created_at: string
    expires_at: string
    token: string
    inviter?: {
      email: string
    }
  }
  currentRole: string
}

export function PendingInvitationAlert({ invitation, currentRole }: PendingInvitationAlertProps) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const router = useRouter()

  const handleAcceptInvitation = async () => {
    setIsAccepting(true)
    try {
      const supabase = createClient()
      
      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Error getting current user:', userError)
        alert('Please sign in again to accept the invitation.')
        return
      }

      console.log('=== DEBUGGING INVITATION ACCEPTANCE ===')
      console.log('Invitation details:', {
        invitation_token: invitation.token,
        user_id: user.id,
        invitation_type: invitation.invitation_type,
        invitation_role: invitation.role,
        invitation_email: invitation.email
      })

      // First, run the debug function to see what's happening step by step
      console.log('Running debug function...')
      const { data: debugData, error: debugError } = await supabase.rpc('debug_accept_invitation_step_by_step', {
        invitation_token: invitation.token,
        test_user_id: user.id
      })

      if (debugError) {
        console.error('Debug function error:', debugError)
      } else {
        console.log('=== DEBUG RESULTS ===')
        console.log('Debug steps:', debugData)
        
        // Show detailed debug info in a more readable format
        if (debugData?.debug_steps) {
          debugData.debug_steps.forEach((step: any) => {
            console.log(`Step ${step.step}: ${step.action} - ${step.result || 'Processing...'}`)
            if (step.details) console.log('  Details:', step.details)
            if (step.error) console.log('  Error:', step.error)
            if (step.error_details) console.log('  Error Details:', step.error_details)
          })
        }
      }

      // Now try the actual invitation acceptance using the accept_team_invitation function
      console.log('=== ATTEMPTING ACTUAL INVITATION ACCEPTANCE ===')
      const { data, error } = await supabase.rpc('accept_team_invitation', {
        p_token: invitation.token,
        p_user_id: user.id
      })

      console.log('Accept invitation response:', { data, error })

      if (error) {
        console.error('Error accepting invitation:', error)
        alert(`Failed to accept invitation: ${error.message}. 

Debug information has been logged to the console. Please check the browser console for detailed step-by-step debugging information.`)
        return
      }

      if (data?.success) {
        // Smoothly refresh to show updated state
        router.refresh()
      } else {
        const errorMessage = data?.error || 'Failed to accept invitation'
        const debugInfo = data?.debug_info ? JSON.stringify(data.debug_info, null, 2) : ''
        console.error('Invitation acceptance failed:', { data, debugInfo })
        alert(`${errorMessage}

Debug information has been logged to the console. Please check the browser console for detailed debugging information.`)
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      alert('An unexpected error occurred. Please check the console for debugging information.')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleRejectInvitation = async () => {
    setIsRejecting(true)
    try {
      const supabase = createClient()
      
      // Update invitation status to cancelled
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitation.id)

      if (error) {
        console.error('Error rejecting invitation:', error)
        alert('Failed to reject invitation. Please try again.')
        return
      }

      // Smoothly refresh to remove the invitation alert
      router.refresh()
    } catch (error) {
      console.error('Error rejecting invitation:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsRejecting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isRoleChange = invitation.invitation_type === 'role_change'
  const inviterEmail = invitation.inviter?.email || 'Unknown'
  const inviteeName = invitation.name || 'You'

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <CardTitle className="text-lg text-orange-800 dark:text-orange-200">
              Pending Invitation
            </CardTitle>
          </div>
          <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-300">
            {isRoleChange ? 'Role Change' : 'New User'}
          </Badge>
        </div>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          You have a pending invitation that requires your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-orange-800 dark:text-orange-200 mb-1">Invitation Details</div>
            <div className="space-y-1 text-orange-700 dark:text-orange-300">
              <div className="flex items-center space-x-2">
                <Mail className="h-3 w-3" />
                <span>Invited by: <span className="font-medium">{inviterEmail}</span></span>
              </div>
              {invitation.name && (
                <div>Name on invitation: <span className="font-medium">{inviteeName}</span></div>
              )}
              <div>Invitation type: <span className="font-medium capitalize">{invitation.invitation_type.replace('_', ' ')}</span></div>
            </div>
          </div>
          <div>
            <div className="font-medium text-orange-800 dark:text-orange-200 mb-1">Role Information</div>
            <div className="space-y-1 text-orange-700 dark:text-orange-300">
              <div>Current role: <Badge variant="secondary" className="text-xs">{currentRole}</Badge></div>
              <div>Invited role: <Badge variant="default" className="text-xs bg-orange-600 hover:bg-orange-700">{invitation.role}</Badge></div>
              <div>Created: {formatDate(invitation.created_at)}</div>
              <div>Expires: {formatDate(invitation.expires_at)}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            onClick={handleAcceptInvitation} 
            disabled={isAccepting || isRejecting}
            className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
          >
            {isAccepting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Accepting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Accept Invitation
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRejectInvitation}
            disabled={isAccepting || isRejecting}
            className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/20 flex-1"
          >
            {isRejecting ? (
              <>
                <div className="h-4 w-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-2" />
                Rejecting...
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Reject
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 