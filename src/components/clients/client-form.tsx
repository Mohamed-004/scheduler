'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Loader2,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface ClientFormProps {
  userRole: string
}

interface ClientData {
  name: string
  email: string
  phone: string
  address: string
  tz: string
}

const COMMON_TIMEZONES = [
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
  { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)' },
  { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)' },
  { value: 'America/Halifax', label: 'Atlantic Time (Halifax)' }
]

export function ClientForm({ userRole }: ClientFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [clientData, setClientData] = useState<ClientData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    tz: 'America/Toronto'
  })

  const handleInputChange = (field: keyof ClientData, value: string) => {
    setClientData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Name validation
    if (!clientData.name.trim()) {
      newErrors.name = 'Client name is required'
    } else if (clientData.name.trim().length < 2) {
      newErrors.name = 'Client name must be at least 2 characters'
    }

    // Email validation
    if (!clientData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(clientData.email.trim())) {
        newErrors.email = 'Please enter a valid email address'
      }
    }

    // Phone validation (optional but format check if provided)
    if (clientData.phone.trim()) {
      const phoneRegex = /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{7,15}$/
      if (!phoneRegex.test(clientData.phone.trim())) {
        newErrors.phone = 'Please enter a valid phone number'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const formatPhoneNumber = (phone: string): string => {
    // Simple North American phone number formatting
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const handlePhoneChange = (value: string) => {
    // Auto-format phone number as user types
    const formatted = formatPhoneNumber(value)
    handleInputChange('phone', formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors below')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: clientData.name.trim(),
            email: clientData.email.trim().toLowerCase(),
            phone: clientData.phone.trim(),
            address: clientData.address.trim(),
            tz: clientData.tz
          })
        })

        const result = await response.json()

        if (result.success) {
          toast.success('Client created successfully!')
          router.push('/dashboard/clients')
        } else {
          toast.error(result.error || 'Failed to create client')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
      }
    })
  }

  const getFieldIcon = (field: keyof ClientData) => {
    const iconProps = { className: "h-4 w-4" }
    switch (field) {
      case 'name': return <User {...iconProps} />
      case 'email': return <Mail {...iconProps} />
      case 'phone': return <Phone {...iconProps} />
      case 'address': return <MapPin {...iconProps} />
      case 'tz': return <Clock {...iconProps} />
      default: return null
    }
  }

  const getFieldValidationIcon = (field: keyof ClientData) => {
    if (errors[field]) {
      return <AlertCircle className="h-4 w-4 text-destructive" />
    } else if (clientData[field].trim() && !errors[field]) {
      if (field === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(clientData[field].trim()) ? 
          <CheckCircle className="h-4 w-4 text-success" /> : null
      } else if (field === 'name' && clientData[field].trim().length >= 2) {
        return <CheckCircle className="h-4 w-4 text-success" />
      }
    }
    return null
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="h-5 w-5 mr-2" />
          Client Information
        </CardTitle>
        <CardDescription>
          Enter the client's contact information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center space-x-2">
              {getFieldIcon('name')}
              <span>Client Name *</span>
            </Label>
            <div className="relative">
              <Input
                id="name"
                value={clientData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter client or company name"
                className={`pr-10 ${errors.name ? 'border-destructive' : ''}`}
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getFieldValidationIcon('name')}
              </div>
            </div>
            {errors.name && (
              <p className="text-sm text-destructive flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center space-x-2">
              {getFieldIcon('email')}
              <span>Email Address *</span>
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={clientData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="client@example.com"
                className={`pr-10 ${errors.email ? 'border-destructive' : ''}`}
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getFieldValidationIcon('email')}
              </div>
            </div>
            {errors.email && (
              <p className="text-sm text-destructive flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center space-x-2">
              {getFieldIcon('phone')}
              <span>Phone Number</span>
            </Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                value={clientData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(555) 123-4567"
                className={`pr-10 ${errors.phone ? 'border-destructive' : ''}`}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getFieldValidationIcon('phone')}
              </div>
            </div>
            {errors.phone && (
              <p className="text-sm text-destructive flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.phone}</span>
              </p>
            )}
          </div>

          {/* Address Field */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center space-x-2">
              {getFieldIcon('address')}
              <span>Address</span>
            </Label>
            <div className="relative">
              <Input
                id="address"
                value={clientData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Main Street, City, Province/State"
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getFieldValidationIcon('address')}
              </div>
            </div>
          </div>

          {/* Timezone Field */}
          <div className="space-y-2">
            <Label htmlFor="tz" className="flex items-center space-x-2">
              {getFieldIcon('tz')}
              <span>Timezone</span>
            </Label>
            <select
              id="tz"
              value={clientData.tz}
              onChange={(e) => handleInputChange('tz', e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Used for scheduling and communication timing
            </p>
          </div>

          {/* Additional Notes Section */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Client will be added to your database</li>
              <li>• You can immediately create jobs for this client</li>
              <li>• Contact information will be available for scheduling</li>
              <li>• Client can be edited later if needed</li>
            </ul>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center space-x-4 pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Client...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Client
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/clients')}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}