'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUpBusiness } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function BusinessSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const businessData = {
        business_name: formData.get('business_name') as string,
        owner_name: formData.get('owner_name') as string,
        owner_email: formData.get('owner_email') as string,
        password: formData.get('password') as string,
      }

      // Validate required fields
      if (!businessData.business_name || !businessData.owner_name || 
          !businessData.owner_email || !businessData.password) {
        setError('All fields are required')
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(businessData.owner_email)) {
        setError('Please enter a valid email address')
        return
      }

      // Validate password length
      if (businessData.password.length < 6) {
        setError('Password must be at least 6 characters long')
        return
      }

      console.log('Starting business signup...', businessData.owner_email)
      const result = await signUpBusiness(businessData)
      console.log('Signup result:', result)

      if (result.error) {
        if (result.requiresConfirmation) {
          setSuccess('Account created! Please check your email and click the confirmation link to complete signup.')
        } else {
          setError(result.error)
        }
      } else if (result.success) {
        if (result.signedIn) {
          // User is signed in, redirect to dashboard
          console.log('User signed in, redirecting to dashboard')
          setSuccess('Account created successfully! Redirecting...')
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1000)
        } else {
          // Account created but email confirmation needed
          setSuccess('Account created! Please check your email for confirmation.')
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Signup error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create Your Business Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Start scheduling and managing your team today
          </p>
        </div>

        <Card className="p-8">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
                Business Name *
              </Label>
              <Input
                id="business_name"
                name="business_name"
                type="text"
                required
                placeholder="Your Business Name"
                className="mt-1"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="owner_name" className="block text-sm font-medium text-gray-700">
                Your Full Name *
              </Label>
              <Input
                id="owner_name"
                name="owner_name"
                type="text"
                required
                placeholder="John Doe"
                className="mt-1"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="owner_email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </Label>
              <Input
                id="owner_email"
                name="owner_email"
                type="email"
                required
                placeholder="john@example.com"
                className="mt-1"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Minimum 6 characters"
                className="mt-1"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Business Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in here
              </a>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Have an invitation?{' '}
              <a href="/auth/invite" className="font-medium text-indigo-600 hover:text-indigo-500">
                Join a team
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
} 