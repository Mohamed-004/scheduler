import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FAQContent } from '@/components/faq/faq-content'
import { HelpCircle, BookOpen, Users, Calendar } from 'lucide-react'

export default async function FAQPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/signin')
  }

  // Get user profile for role-specific content
  const { data: userProfile } = await supabase
    .from('users')
    .select('role, team_id')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/auth/signin')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <HelpCircle className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-foreground">Help & FAQ</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Complete guide to using Dynamic Crew Scheduler - from setup to successful job creation
        </p>
      </div>

      {/* Quick Start Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg text-blue-900">Setup Guide</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800">
              Learn how to create job roles and assign workers - the foundation of successful job scheduling.
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg text-green-900">Job Creation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-800">
              Master the 6-step job wizard and understand the new strict validation system.
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg text-purple-900">Best Practices</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-800">
              Tips and tricks for efficient workflow management and avoiding common mistakes.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main FAQ Content */}
      <FAQContent userRole={userProfile.role} />
    </div>
  )
}