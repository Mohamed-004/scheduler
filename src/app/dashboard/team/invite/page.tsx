'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, Plus, X, Send, UserPlus, Trash2, AlertTriangle, CheckCircle, RefreshCw, Users } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface InviteData {
  email: string
  role: 'admin' | 'sales' | 'worker'
  name?: string
  userExists?: boolean
  currentRole?: string
}

interface EmailCheckResult {
  exists: boolean
  currentRole?: string
}

export default function InviteTeamPage() {
  const router = useRouter()
  const [invites, setInvites] = useState<InviteData[]>([
    { email: '', role: 'worker' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingEmails, setIsCheckingEmails] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const addInvite = () => {
    setInvites([...invites, { email: '', role: 'worker' }])
  }

  const removeInvite = (index: number) => {
    if (invites.length > 1) {
      setInvites(invites.filter((_, i) => i !== index))
    }
  }

  const updateInvite = (index: number, field: keyof InviteData, value: string) => {
    const updated = [...invites]
    updated[index] = { ...updated[index], [field]: value }
    setInvites(updated)
  }

  // Check if email exists in the system
  const checkEmailExists = async (email: string): Promise<EmailCheckResult> => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('email, role')
        .eq('email', email.trim())
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking email:', error)
        return { exists: false }
      }
      
      return {
        exists: !!data,
        currentRole: data?.role
      }
    } catch (error) {
      console.error('Error checking email existence:', error)
      return { exists: false }
    }
  }

  // Check all emails when user finishes typing
  const handleEmailCheck = async () => {
    setIsCheckingEmails(true)
    
    const updatedInvites = await Promise.all(
      invites.map(async (invite) => {
        if (invite.email.trim()) {
          const result = await checkEmailExists(invite.email)
          return {
            ...invite,
            userExists: result.exists,
            currentRole: result.currentRole
          }
        }
        return invite
      })
    )
    
    setInvites(updatedInvites)
    setIsCheckingEmails(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setMessage({ type: 'error', text: 'You must be logged in to send invitations' })
        setIsLoading(false)
        return
      }
      
      // Validate all invites have emails
      const validInvites = invites.filter(invite => invite.email.trim() !== '')
      
      if (validInvites.length === 0) {
        setMessage({ type: 'error', text: 'Please add at least one email address' })
        setIsLoading(false)
        return
      }

      // Create invitations directly in database using table operations
      const results = []
      for (const invite of validInvites) {
        try {
          // Check if user exists first
          const { data: userCheck } = await supabase.rpc('check_user_exists', {
            check_email: invite.email.trim()
          })
          
          // Determine invitation type
          const invitationType = userCheck?.exists ? 'role_change' : 'new_user'
          
          // Check if user already has the requested role
          if (userCheck?.exists && userCheck.role === invite.role) {
            results.push({ 
              email: invite.email, 
              success: false, 
              error: 'User already has the requested role' 
            })
            continue
          }
          
          // Check for existing pending invitation
          const { data: existingInvitation } = await supabase
            .from('invitations')
            .select('id')
            .eq('email', invite.email.trim())
            .eq('status', 'pending')
            .single()
          
          if (existingInvitation) {
            results.push({ 
              email: invite.email, 
              success: false, 
              error: 'Pending invitation already exists for this email' 
            })
            continue
          }
          
          // Generate token
          const { data: tokenData } = await supabase.rpc('generate_secure_token')
          
          if (!tokenData) {
            results.push({ 
              email: invite.email, 
              success: false, 
              error: 'Failed to generate invitation token' 
            })
            continue
          }
          
          // Create invitation directly
          const { data: newInvitation, error: insertError } = await supabase
            .from('invitations')
            .insert({
              email: invite.email.trim(),
              role: invite.role,
              invited_by: user.id,
              token: tokenData,
              name: invite.name?.trim() || null,
              invitation_type: invitationType,
              status: 'pending',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single()
          
          if (insertError) {
            console.error('Error creating invitation:', insertError)
            results.push({ 
              email: invite.email, 
              success: false, 
              error: insertError.message 
            })
          } else {
            results.push({ 
              email: invite.email, 
              success: true, 
              token: tokenData,
              invitationType: invitationType,
              existingUser: userCheck?.exists || false
            })
          }
          
        } catch (error) {
          console.error('Error processing invitation:', error)
          results.push({ 
            email: invite.email, 
            success: false, 
            error: 'Failed to process invitation' 
          })
        }
      }
      
      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length
      const newUserCount = results.filter(r => r.success && r.invitationType === 'new_user').length
      const roleChangeCount = results.filter(r => r.success && r.invitationType === 'role_change').length
      
      if (successCount > 0) {
        // Send invitation emails
        const { sendInvitationEmail, sendRoleChangeEmail } = await import('@/lib/email')
        
        // Get inviter name
        const { data: inviterProfile } = await supabase
          .from('users')
          .select('email')
          .eq('id', user.id)
          .single()
        
        const inviterName = inviterProfile?.email || 'Team Admin'
        
        // Send emails for successful invitations
        for (const result of results.filter(r => r.success)) {
          const invitationUrl = `${window.location.origin}/auth/invite?token=${result.token}`
          const invite = validInvites.find(inv => inv.email === result.email)
          
          const emailData = {
            email: result.email,
            name: invite?.name,
            role: invite?.role || 'worker',
            inviterName,
            invitationUrl,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
          }
          
          try {
            if (result.invitationType === 'role_change') {
              await sendRoleChangeEmail(emailData)
            } else {
              await sendInvitationEmail(emailData)
            }
            console.log(`📧 Invitation email sent to ${result.email}`)
          } catch (emailError) {
            console.error(`Failed to send email to ${result.email}:`, emailError)
          }
        }
        
        let successMessage = `Successfully created ${successCount} invitation${successCount > 1 ? 's' : ''}!`
        if (newUserCount > 0 && roleChangeCount > 0) {
          successMessage += ` (${newUserCount} new user${newUserCount > 1 ? 's' : ''}, ${roleChangeCount} role change${roleChangeCount > 1 ? 's' : ''})`
        } else if (newUserCount > 0) {
          successMessage += ` (${newUserCount} new user${newUserCount > 1 ? 's' : ''})`
        } else if (roleChangeCount > 0) {
          successMessage += ` (${roleChangeCount} role change${roleChangeCount > 1 ? 's' : ''})`
        }
        
        if (failureCount > 0) {
          successMessage += ` ${failureCount} failed.`
        }
        
        setMessage({ type: 'success', text: successMessage })
        
        // Reset form on success
        if (failureCount === 0) {
          setInvites([{ email: '', role: 'worker' }])
          
          // Redirect after success
          setTimeout(() => {
            router.push('/dashboard/team')
          }, 2000)
        }
      } else {
        setMessage({ type: 'error', text: 'All invitations failed to create. Please check the email addresses and try again.' })
      }
      
    } catch (error) {
      console.error('Error sending invitations:', error)
      setMessage({ type: 'error', text: 'Failed to send invitations. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'sales':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'worker':
        return 'bg-success/10 text-success border-success/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full system access, can manage all users and settings'
      case 'sales':
        return 'Can manage jobs, clients, and view reports'
      case 'worker':
        return 'Can view assigned jobs and update job status'
      default:
        return ''
    }
  }

  const getInviteTypeIndicator = (invite: InviteData) => {
    if (!invite.email.trim()) return null
    
    if (invite.userExists) {
      if (invite.currentRole === invite.role) {
        return (
          <div className="flex items-center text-amber-600 text-sm mt-1">
            <AlertTriangle className="h-3 w-3 mr-1" />
            User already has this role
          </div>
        )
      } else {
        return (
          <div className="flex items-center text-blue-600 text-sm mt-1">
            <RefreshCw className="h-3 w-3 mr-1" />
            Role change: {invite.currentRole} → {invite.role}
          </div>
        )
      }
    } else {
      return (
        <div className="flex items-center text-green-600 text-sm mt-1">
          <UserPlus className="h-3 w-3 mr-1" />
          New user invitation
        </div>
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/team">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Invite Team Members
          </h2>
          <p className="text-muted-foreground">
            Send email invitations to add new team members or change existing user roles
          </p>
        </div>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            How Invitations Work
          </CardTitle>
          <CardDescription>
            The system automatically detects whether you're inviting new users or changing existing user roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border border-border rounded-lg bg-green-50/50 dark:bg-green-950/20">
              <div className="flex items-center space-x-2 mb-2">
                <UserPlus className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">New User Invitations</span>
              </div>
              <p className="text-sm text-muted-foreground">
                When you enter an email that doesn't exist in the system, we'll create a new user invitation. They'll need to create a password and will be assigned the role you specify.
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center space-x-2 mb-2">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-700 dark:text-blue-400">Role Change Invitations</span>
              </div>
              <p className="text-sm text-muted-foreground">
                When you enter an email of an existing user, we'll send them a role change invitation. They can accept to update their role without creating a new account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Role Permissions
          </CardTitle>
          <CardDescription>
            Understand what each role can do in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {['admin', 'sales', 'worker'].map((role) => (
              <div key={role} className="p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={getRoleBadgeColor(role)}>
                    {role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getRoleDescription(role)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invitation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Send Invitations
          </CardTitle>
          <CardDescription>
            Add email addresses and assign roles for your team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Invites List */}
            <div className="space-y-4">
              {invites.map((invite, index) => (
                <div key={index} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-foreground">
                      Invitation #{index + 1}
                    </h4>
                    {invites.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeInvite(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <Label htmlFor={`email-${index}`}>Email Address *</Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        placeholder="colleague@company.com"
                        value={invite.email}
                        onChange={(e) => updateInvite(index, 'email', e.target.value)}
                        onBlur={handleEmailCheck}
                        required
                        className="mt-1"
                      />
                      {getInviteTypeIndicator(invite)}
                    </div>
                    
                    <div>
                      <Label htmlFor={`role-${index}`}>Role *</Label>
                      <select
                        id={`role-${index}`}
                        value={invite.role}
                        onChange={(e) => updateInvite(index, 'role', e.target.value as any)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        <option value="worker">Worker</option>
                        <option value="sales">Sales</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <Label htmlFor={`name-${index}`}>Name (Optional)</Label>
                    <Input
                      id={`name-${index}`}
                      type="text"
                      placeholder="John Doe"
                      value={invite.name || ''}
                      onChange={(e) => updateInvite(index, 'name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Button */}
            <Button
              type="button"
              variant="outline"
              onClick={addInvite}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Invitation
            </Button>

            {/* Check Emails Button */}
            {invites.some(invite => invite.email.trim()) && (
              <Button
                type="button"
                variant="outline"
                onClick={handleEmailCheck}
                disabled={isCheckingEmails}
                className="w-full"
              >
                {isCheckingEmails ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Checking emails...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Email Status
                  </>
                )}
              </Button>
            )}

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

            {/* Submit Button */}
            <div className="flex items-center space-x-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Sending Invitations...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send {invites.filter(i => i.email.trim()).length} Invitation{invites.filter(i => i.email.trim()).length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              
              <Link href="/dashboard/team">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 