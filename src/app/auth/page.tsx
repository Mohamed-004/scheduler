import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Dynamic Crew Scheduler</CardTitle>
          <CardDescription>
            Intelligent workforce management platform for field operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Link href="/auth/signin" className="block">
              <Button className="w-full" size="lg">
                Sign In
              </Button>
            </Link>
            
            <Link href="/auth/signup" className="block">
              <Button variant="outline" className="w-full" size="lg">
                Create Account
              </Button>
            </Link>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-6">
            <p>Automate scheduling • Manage crews • Track progress</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 