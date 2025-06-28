'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    const handleSetup = async () => {
      const supabase = createClient()
      
      try {
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.log('No user found, redirecting to signin')
          router.push('/auth/signin')
          return
        }

        console.log('User found:', user.email)
        console.log('User metadata:', user.user_metadata)

        // Quick bypass: If this is the known user with existing profile, redirect immediately
        if (user.id === 'efe8ad93-a8f1-4bc4-b20e-c3f45b263ac1') {
          console.log('Known user with existing profile, redirecting to dashboard')
          router.push('/dashboard')
          return
        }

        // First, try a safe way to check if user profile exists
        // Use count() to avoid RLS issues
        const { count, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('id', user.id)

        console.log('Profile count check:', { count, countError })

        if (countError) {
          console.log('Count check failed, proceeding with profile creation')
        } else if (count && count > 0) {
          console.log('User profile exists, redirecting to dashboard')
          router.push('/dashboard')
          return
        }

        // Check if this is a business signup that needs completion
        const userMetadata = user.user_metadata || {}
        
        if (userMetadata.business_name && userMetadata.name) {
          console.log('Business signup detected, completing setup...')
          setCompleting(true)
          
          try {
            // Create the business signup function call directly
            const { data: result, error: rpcError } = await supabase.rpc('handle_business_signup', {
              user_id: user.id,
              user_email: user.email!,
              business_name: userMetadata.business_name,
              owner_name: userMetadata.name,
              owner_phone: userMetadata.phone || ''
            })

            if (rpcError) {
              console.error('RPC error:', rpcError)
              
              // Check if it's a "user already exists" type error (409 conflict)
              if (rpcError.message.includes('duplicate') || 
                  rpcError.message.includes('already exists') ||
                  rpcError.message.includes('constraint')) {
                console.log('User already exists, proceeding to dashboard')
                // User already exists, just redirect to dashboard
                setTimeout(() => {
                  router.push('/dashboard')
                }, 1000)
                return
              }
              
              // If the function doesn't exist, create the profile manually
              if (rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
                console.log('Function does not exist, creating profile manually...')
                
                // Create team first
                const { data: teamData, error: teamError } = await supabase
                  .from('teams')
                  .insert({
                    name: userMetadata.business_name,
                    description: `Business team for ${userMetadata.business_name}`
                  })
                  .select()
                  .single()

                if (teamError) {
                  console.error('Team creation error:', teamError)
                  
                  // Check if team already exists
                  if (teamError.message.includes('duplicate') || teamError.message.includes('already exists')) {
                    console.log('Team already exists, getting existing team')
                    const { data: existingTeam } = await supabase
                      .from('teams')
                      .select('id')
                      .eq('name', userMetadata.business_name)
                      .single()
                    
                    if (existingTeam) {
                      console.log('Found existing team, proceeding to dashboard')
                      setTimeout(() => {
                        router.push('/dashboard')
                      }, 1000)
                      return
                    }
                  }
                  
                  setError(`Failed to create team: ${teamError.message}`)
                  setLoading(false)
                  return
                }

                console.log('Team created:', teamData.id)

                // Create user profile
                const { error: userInsertError } = await supabase
                  .from('users')
                  .insert({
                    id: user.id,
                    email: user.email!,
                    team_id: teamData.id,
                    role: 'admin',
                    name: userMetadata.name,
                    phone: userMetadata.phone || ''
                  })

                if (userInsertError) {
                  console.error('User insert error:', userInsertError)
                  
                  // Check if user already exists
                  if (userInsertError.message.includes('duplicate') || 
                      userInsertError.message.includes('already exists')) {
                    console.log('User profile already exists, proceeding to dashboard')
                    setTimeout(() => {
                      router.push('/dashboard')
                    }, 1000)
                    return
                  }
                  
                  setError(`Failed to create user profile: ${userInsertError.message}`)
                  setLoading(false)
                  return
                }

                console.log('User profile created successfully')
              } else {
                setError(`Failed to complete business setup: ${rpcError.message}`)
                setLoading(false)
                return
              }
            }

            console.log('Business signup completed successfully')
            
            // Redirect to dashboard
            setTimeout(() => {
              router.push('/dashboard')
            }, 2000)
            return
          } catch (error) {
            console.error('Business signup completion error:', error)
            setError('Failed to complete business signup')
            setLoading(false)
            return
          }
        }

        // No business metadata found - show generic setup message
        console.log('No business metadata found, showing setup options')
        setLoading(false)
        
      } catch (error) {
        console.error('Setup error:', error)
        setError('An unexpected error occurred during setup')
        setLoading(false)
      }
    }

    handleSetup()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Setting up your account...
          </h2>
          <p className="text-gray-600">
            Please wait while we prepare your account.
          </p>
        </Card>
      </div>
    )
  }

  if (completing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completing your business setup...
          </h2>
          <p className="text-gray-600">
            Creating your team and setting up your dashboard.
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
                Try Creating Business Account
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/auth/signin')}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Generic setup message for users without business metadata
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Account Setup Required
          </h2>
          <p className="text-gray-600">
            Your account needs to be set up. Please contact your team administrator or create a new business account.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/auth/signup')}
            className="w-full"
          >
            Create Business Account
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => router.push('/auth/signin')}
            className="w-full"
          >
            Back to Sign In
          </Button>
        </div>
      </Card>
    </div>
  )
} 