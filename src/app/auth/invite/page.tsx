'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signUpTeamMember, getInvitationByToken } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { isValidPhoneNumber, parsePhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js'

interface InvitationDetails {
  id: string
  email: string
  role: string
  name?: string
  team: { name: string }
  inviter: { name: string }
  expires_at: string
}

const COMMON_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
]

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [loadingInvitation, setLoadingInvitation] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailMismatch, setEmailMismatch] = useState<{ currentEmail: string; invitationEmail: string } | null>(null)
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [selectedCountry, setSelectedCountry] = useState('US')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Load invitation details on mount
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided')
      setLoadingInvitation(false)
      return
    }

    async function loadInvitation() {
      try {
        console.log('🔍 Loading invitation with token:', token)
        const result = await getInvitationByToken(token!)
        console.log('📋 Invitation result:', result)
        
        if (result.error) {
          console.error('❌ Invitation error:', result.error)
          setError(result.error)
        } else if (result.success && result.invitation) {
          console.log('✅ Invitation loaded successfully:', result.invitation)
          setInvitation(result.invitation)
        } else {
          console.error('❌ Unexpected result format:', result)
          setError('Invalid invitation response')
        }
      } catch (error) {
        console.error('❌ Exception loading invitation:', error)
        setError('Failed to load invitation details')
      } finally {
        setLoadingInvitation(false)
      }
    }

    loadInvitation()
  }, [token])

  // Validate phone number when country or number changes
  useEffect(() => {
    if (phoneNumber.trim()) {
      try {
        const countryCallingCode = `+${getCountryCallingCode(selectedCountry as any)}`
        const fullPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `${countryCallingCode}${phoneNumber.replace(/\D/g, '')}`
        
        if (isValidPhoneNumber(fullPhoneNumber, selectedCountry as any)) {
          setPhoneError(null)
        } else {
          setPhoneError('Please enter a valid phone number')
        }
      } catch (error) {
        setPhoneError('Please enter a valid phone number')
      }
    } else {
      setPhoneError(null)
    }
  }, [phoneNumber, selectedCountry])

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '')
    
    // Don't format if user is typing a country code
    if (value.startsWith('+')) {
      return value
    }

    try {
      const countryCallingCode = `+${getCountryCallingCode(selectedCountry as any)}`
      const fullNumber = `${countryCallingCode}${digitsOnly}`
      const parsed = parsePhoneNumber(fullNumber, selectedCountry as any)
      return parsed ? parsed.formatNational() : value
    } catch {
      return value
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPhoneNumber(value)
  }

  const handleSubmit = async (formData: FormData) => {
    if (!token || !invitation) {
      setError('Invalid invitation')
      return
    }

    setLoading(true)
    setError(null)
    setEmailMismatch(null)

    try {
      // Validate phone number
      if (phoneNumber && phoneError) {
        setError('Please enter a valid phone number')
        return
      }

      // Format phone number to international format
      let formattedPhone = ''
      if (phoneNumber.trim()) {
        try {
          const countryCallingCode = `+${getCountryCallingCode(selectedCountry as any)}`
          const fullPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `${countryCallingCode}${phoneNumber.replace(/\D/g, '')}`
          const parsed = parsePhoneNumber(fullPhoneNumber, selectedCountry as any)
          formattedPhone = parsed ? parsed.formatInternational() : phoneNumber
        } catch {
          formattedPhone = phoneNumber
        }
      }

      const memberData = {
        invitation_token: token,
        name: formData.get('name') as string,
        phone: formattedPhone,
        password: formData.get('password') as string,
      }

      // Validate required fields
      if (!memberData.name || !memberData.phone) {
        setError('Name and phone are required')
        return
      }

      console.log('🚀 Submitting team member signup:', memberData)
      const result = await signUpTeamMember(memberData)
      console.log('📋 Signup result:', result)

      if (result.error) {
        // Check if it's an email mismatch error
        if (result.emailMismatch && result.currentEmail && result.invitationEmail) {
          setEmailMismatch({
            currentEmail: result.currentEmail,
            invitationEmail: result.invitationEmail
          })
          setError(result.error)
        } else {
          setError(result.error)
        }
      } else {
        // Success! Redirect to dashboard
        console.log('✅ Successfully joined team, redirecting to dashboard')
        router.push('/dashboard')
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Join team error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'This invitation is invalid or has expired.'}
            </p>
            <Button onClick={() => router.push('/auth/signin')}>
              Go to Sign In
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'sales':
        return 'bg-blue-100 text-blue-800'
      case 'worker':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const expiresAt = new Date(invitation.expires_at).toLocaleDateString()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Join Team
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You've been invited to join {invitation.team.name}
          </p>
        </div>

        <Card className="p-8">
          {/* Invitation Details */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {invitation.team.name}
              </h3>
              <p className="text-sm text-gray-600">
                Invited by {invitation.inviter.name}
              </p>
            </div>
            
            <div className="flex justify-center mb-2">
              <Badge className={getRoleBadgeColor(invitation.role)}>
                {invitation.role.toUpperCase()}
              </Badge>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              Invitation expires on {expiresAt}
            </p>
          </div>

          <form action={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name *
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Your full name"
                defaultValue={invitation.name || ''}
                className="mt-1"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number *
              </Label>
              
              {/* Country Selection */}
              <div className="mt-1 flex space-x-2">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="flex-shrink-0 w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                >
                  {COMMON_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} +{getCountryCallingCode(country.code as any)}
                    </option>
                  ))}
                </select>
                
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className={`flex-1 ${phoneError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  disabled={loading}
                />
              </div>
              
              {phoneError && (
                <p className="mt-1 text-xs text-red-600">{phoneError}</p>
              )}
              
              <p className="mt-1 text-xs text-gray-500">
                Enter your phone number without the country code
              </p>
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password (if you don't have an account)
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Leave empty if you already have an account"
                className="mt-1"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Only required if you're new to the platform
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {emailMismatch ? (
                  <div>
                    <p className="font-semibold mb-2">Wrong Account</p>
                    <p className="mb-3">{error}</p>
                    <button
                      onClick={async () => {
                        try {
                          setLoading(true)
                          // Import signOut function
                          const { signOut } = await import('../actions')
                          await signOut()
                          // Clear states and refresh
                          setEmailMismatch(null)
                          setError(null)
                          window.location.reload()
                        } catch (error) {
                          console.error('Failed to sign out:', error)
                          setError('Failed to sign out. Please manually sign out and try again.')
                        } finally {
                          setLoading(false)
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                      disabled={loading}
                    >
                      Sign Out & Try Again
                    </button>
                  </div>
                ) : (
                  error
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !!phoneError}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Joining Team...
                </div>
              ) : (
                'Join Team'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't want to join?{' '}
              <a href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in to your account
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
} 