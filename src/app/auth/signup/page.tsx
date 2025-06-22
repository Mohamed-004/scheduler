'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Mail, ArrowLeft, Shield, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { signUp } from '../actions'

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'sales' | 'worker'>('worker')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    // Validate passwords match
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      await signUp(formData)
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mx-auto mb-4">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Create Account</CardTitle>
            <CardDescription className="text-gray-600">
              Join Dynamic Crew Scheduler and start managing your team
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  className="w-full"
                />
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create password"
                    required
                    minLength={6}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    required
                    minLength={6}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role">Select Your Role</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose the role that best describes your position. This can be changed later by an administrator.
                  </p>
                </div>
                
                <input type="hidden" name="role" value={selectedRole} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['admin', 'sales', 'worker'] as const).map((role) => (
                    <div
                      key={role}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedRole === role
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedRole(role)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getRoleBadgeColor(role)}>
                          {role}
                        </Badge>
                        {selectedRole === role && (
                          <Shield className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getRoleDescription(role)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {error}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-blue-600 hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Additional Info */}
            <div className="text-center">
              <div className="flex items-center gap-2 p-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-xs text-blue-500">
                    Note: Your role can be updated later by team administrators through invitations.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 