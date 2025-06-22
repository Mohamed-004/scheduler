'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, UserPlus, Mail, Shield, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface InvitationData {
  email: string
  role: string
  name?: string
  invited_by_email?: string
  expires_at: string
  status: string
  invitation_type?: string
}

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isExistingUser, setIsExistingUser] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided')
      setIsLoading(false)
      return
    }
    
    fetchInvitation()
  }, [token])

  const fetchInvitation = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          email,
          role,
          name,
          expires_at,
          status,
          invitation_type,
          invited_by:users!invited_by(email)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (error) {
        setError('Invalid or expired invitation')
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired')
        return
      }

      setInvitation({
        ...data,
        invited_by_email: (data.invited_by as any)?.email
      })
      setFormData(prev => ({ ...prev, email: data.email }))
      
      // Check if this is a role change invitation
      setIsExistingUser(data.invitation_type === 'role_change')
      
    } catch (err) {
      console.error('Error fetching invitation:', err)
      setError('Failed to load invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isExistingUser) {
      // For new users, validate password fields
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    setIsAccepting(true)
    setError(null)

    try {
      const supabase = createClient()
      
      if (isExistingUser) {
        // For existing users (role change), just accept the invitation
        const { data: acceptData, error: acceptError } = await supabase.rpc('accept_invitation', {
          invitation_token: token
        })

        if (acceptError) {
          setError(acceptError.message)
          return
        }

        if (!acceptData.success) {
          setError(acceptData.error || 'Failed to accept role change invitation')
          return
        }

        setSuccess(true)
        
        // Redirect to dashboard after successful role change
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      } else {
        // For new users, sign up first then accept invitation
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              invitation_token: token
            }
          }
        })

        if (authError) {
          setError(authError.message)
          return
        }

        if (!authData.user) {
          setError('Failed to create account')
          return
        }

        // Accept the invitation and assign the role
        const { data: acceptData, error: acceptError } = await supabase.rpc('accept_invitation', {
          invitation_token: token,
          user_id: authData.user.id
        })

        if (acceptError) {
          setError(acceptError.message)
          return
        }

        if (!acceptData.success) {
          setError(acceptData.error || 'Failed to accept invitation')
          return
        }

        setSuccess(true)
        
        // Redirect to dashboard after successful acceptance
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      }
      
    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setIsAccepting(false)
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
            <p className="text-center text-muted-foreground mt-4">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signin">
              <Button className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="text-success">
              {isExistingUser ? 'Role Updated!' : 'Welcome to the Team!'}
            </CardTitle>
            <CardDescription>
              {isExistingUser 
                ? 'Your role has been updated successfully. You\'ll be redirected to the dashboard shortly.'
                : 'Your account has been created successfully. You\'ll be redirected to the dashboard shortly.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm font-medium">{invitation?.email}</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {isExistingUser ? 'New Role:' : 'Role:'}
                </span>
                <Badge className={getRoleBadgeColor(invitation?.role || '')}>
                  {invitation?.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {isExistingUser ? <RefreshCw className="h-6 w-6 text-primary" /> : <UserPlus className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle>
            {isExistingUser ? 'Role Change Invitation' : 'You\'re Invited!'}
          </CardTitle>
          <CardDescription>
            {isExistingUser 
              ? `${invitation?.invited_by_email} has invited you to change your role`
              : `${invitation?.invited_by_email} has invited you to join their team`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <h3 className="font-medium text-foreground mb-3">
                {isExistingUser ? 'Role Change Details' : 'Invitation Details'}
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm font-medium">{invitation?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isExistingUser ? 'New Role:' : 'Role:'}
                  </span>
                  <Badge className={getRoleBadgeColor(invitation?.role || '')}>
                    {invitation?.role}
                  </Badge>
                </div>
                {invitation?.name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium">{invitation.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expires:</span>
                  <span className="text-sm font-medium">
                    {new Date(invitation?.expires_at || '').toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-background rounded border">
                <p className="text-xs text-muted-foreground">
                  <strong>As a {invitation?.role}:</strong> {getRoleDescription(invitation?.role || '')}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="mt-1 bg-muted"
              />
            </div>
            
            {!isExistingUser && (
              <>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isAccepting}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isAccepting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                  {isExistingUser ? 'Updating Role...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  {isExistingUser ? <RefreshCw className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  {isExistingUser ? 'Accept Role Change' : 'Accept Invitation & Create Account'}
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {isExistingUser 
                ? 'By accepting this role change, you agree to the new responsibilities and access levels.'
                : 'By accepting this invitation, you agree to join the team and follow the organization\'s policies.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 