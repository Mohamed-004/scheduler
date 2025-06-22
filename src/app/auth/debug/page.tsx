'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DebugPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const testSignIn = async () => {
    setLoading(true)
    setResult(null)
    
    console.log('Testing sign in with:', { email, password: '***' })
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })
      
      console.log('Sign in result:', { data, error })
      
      setResult({
        type: 'signIn',
        success: !error,
        data: data,
        error: error,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.error('Sign in exception:', err)
      setResult({
        type: 'signIn',
        success: false,
        error: err,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const testSignUp = async () => {
    setLoading(true)
    setResult(null)
    
    console.log('Testing sign up with:', { email, password: '***' })
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password
      })
      
      console.log('Sign up result:', { data, error })
      
      setResult({
        type: 'signUp',
        success: !error,
        data: data,
        error: error,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.error('Sign up exception:', err)
      setResult({
        type: 'signUp',
        success: false,
        error: err,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const testResetPassword = async () => {
    setLoading(true)
    setResult(null)
    
    console.log('Testing password reset for:', email)
    
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'http://localhost:3004/auth/update-password',
      })
      
      console.log('Reset password result:', { data, error })
      
      setResult({
        type: 'resetPassword',
        success: !error,
        data: data,
        error: error,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.error('Reset password exception:', err)
      setResult({
        type: 'resetPassword',
        success: false,
        error: err,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const checkCurrentUser = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const { data, error } = await supabase.auth.getUser()
      
      console.log('Current user:', { data, error })
      
      setResult({
        type: 'getCurrentUser',
        success: !error,
        data: data,
        error: error,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.error('Get user exception:', err)
      setResult({
        type: 'getCurrentUser',
        success: false,
        error: err,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Authentication Debug Tool</CardTitle>
          <CardDescription>
            Test authentication functions and debug issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button onClick={testSignIn} disabled={loading || !email || !password}>
              Test Sign In
            </Button>
            <Button onClick={testSignUp} disabled={loading || !email || !password} variant="outline">
              Test Sign Up
            </Button>
            <Button onClick={testResetPassword} disabled={loading || !email} variant="secondary">
              Test Reset Password
            </Button>
            <Button onClick={checkCurrentUser} disabled={loading} variant="ghost">
              Check Current User
            </Button>
          </div>
          
          {result && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-2">
                {result.type} Result: {result.success ? '✅ Success' : '❌ Failed'}
              </h3>
              <pre className="text-sm overflow-auto bg-white p-2 rounded border max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="text-sm text-gray-600 border-t pt-4">
            <p><strong>Instructions:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Enter your email and password</li>
              <li>Click any test button to see detailed results</li>
              <li>Check the browser console for additional logs</li>
              <li>All functions use the official Supabase client library</li>
              <li><strong>Test with existing account:</strong> abdelaalmohamed004@gmail.com</li>
              <li><strong>Test signup:</strong> Use a new email to test signup without confirmation</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 