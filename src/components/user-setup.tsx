'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from '@/lib/supabase/client'
import { getUserTimezone, getCommonTimezones } from '@/lib/timezone'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const setupSchema = z.object({
  role: z.enum(['admin', 'sales', 'worker']),
  tz: z.string().min(1, 'Please select your timezone'),
})

type SetupForm = z.infer<typeof setupSchema>

interface UserSetupProps {
  user: SupabaseUser
}

export function UserSetup({ user }: UserSetupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      tz: getUserTimezone(),
      role: 'worker',
    },
  })

  const onSubmit = async (data: SetupForm) => {
    setIsLoading(true)
    setError(null)

    try {
      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          role: data.role,
          tz: data.tz,
        })

      if (profileError) {
        setError(`Failed to create user profile: ${profileError.message}`)
        return
      }

      // If the user selected 'worker' role, also create a worker profile
      if (data.role === 'worker') {
        const { error: workerError } = await supabase
          .from('workers')
          .insert({
            user_id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Worker',
            phone: '',
            tz: data.tz,
          })

        if (workerError) {
          console.error('Worker profile creation error:', workerError)
          // Don't fail the whole process
        }
      }

      // Refresh the page to show the dashboard
      router.refresh()
      
    } catch (err) {
      console.error('Setup error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const timezones = getCommonTimezones()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Setup</CardTitle>
          <CardDescription>
            Welcome {user.email}! Let's set up your account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                This email is linked to your account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Your Role</Label>
              <select
                id="role"
                {...register('role')}
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="worker">Worker - Execute jobs and manage tasks</option>
                <option value="sales">Sales - Create jobs and manage clients</option>
                <option value="admin">Admin - Full system access</option>
              </select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tz">Timezone</Label>
              <select
                id="tz"
                {...register('tz')}
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              {errors.tz && (
                <p className="text-sm text-red-600">{errors.tz.message}</p>
              )}
              <p className="text-xs text-gray-500">
                We've detected your timezone automatically, but you can change it
              </p>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Setting up your account...' : 'Complete Setup'}
            </Button>

            <div className="text-center text-sm text-gray-600">
              You can always change these settings later
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 