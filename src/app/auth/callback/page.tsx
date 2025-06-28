'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()

      try {
        // Get current session to see if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Failed to verify authentication')
          return
        }

        if (session?.user) {
          console.log('User authenticated:', session.user.email)
          
          // Try to get user profile - disable RLS temporarily by using a simple query
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle() // Use maybeSingle instead of single to handle not found gracefully

          console.log('Profile query result:', { userProfile, profileError })

          if (profileError) {
            console.error('Profile query error:', profileError)
            setError(`Database error: ${profileError.message}`)
            return
          }

          if (!userProfile) {
            // User authenticated but no profile exists
            // This happens when email confirmation was required and profile creation was deferred
            console.log('No profile found, checking for business signup metadata')
            
            // Check if this is a business signup by looking at user metadata
            const userMetadata = session.user.user_metadata || {}
            console.log('User metadata:', userMetadata)
            
            if (userMetadata.business_name && userMetadata.name) {
              // This is a business signup, complete the profile creation
              console.log('Completing business signup profile creation')
              
              try {
                const { data: teamId, error: teamError } = await supabase.rpc('handle_business_signup', {
                  user_id: session.user.id,
                  user_email: session.user.email!,
                  business_name: userMetadata.business_name,
                  owner_name: userMetadata.name,
                  owner_phone: userMetadata.phone || ''
                })

                if (teamError) {
                  console.error('Team creation error:', teamError)
                  setError(`Failed to complete signup: ${teamError.message}`)
                  return
                }

                console.log('Business signup completed, team ID:', teamId)
                setSuccess(true)
                setTimeout(() => {
                  router.push('/dashboard')
                }, 1500)
                return
              } catch (error) {
                console.error('Business signup completion error:', error)
                setError('Failed to complete business signup')
                return
              }
            } else {
              // This might be an invitation signup
              console.log('No business metadata found, redirecting to setup')
              router.push('/auth/setup')
              return
            }
          }

          // User has profile, redirect to dashboard
          console.log('User profile found, redirecting to dashboard')
          setSuccess(true)
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        } else {
          // Not authenticated, redirect to signin
          console.log('No session found, redirecting to signin')
          router.push('/auth/signin')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        setError('Failed to process authentication')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Setting up your account...
          </h2>
          <p className="text-gray-600">
            Please wait while we complete your account setup.
          </p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Setup Failed
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/auth/signup')}
                className="w-full"
              >
                Try Signing Up Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/auth/signin')}
                className="w-full"
              >
                Go to Sign In
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to Your Dashboard!
            </h2>
            <p className="text-gray-600 mb-4">
              Your account setup is complete. Taking you to the dashboard...
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        </Card>
      </div>
    )
  }

  return null
} 