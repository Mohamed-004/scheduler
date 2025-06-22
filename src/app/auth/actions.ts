'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const selectedRole = formData.get('role') as string

  console.log('Attempting signup for:', data.email, 'with role:', selectedRole)

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('Signup error:', error)
    redirect('/auth/signup?error=' + encodeURIComponent(error.message))
  }

  if (authData.user && authData.session) {
    // User is signed up and logged in immediately (email confirmation disabled)
    console.log('User signed up and logged in immediately')
    
    // Create or update user profile with selected role using UPSERT
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: authData.user.email!,
        role: selectedRole as 'admin' | 'sales' | 'worker',
        tz: 'America/Toronto'
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Profile creation/update error:', profileError)
      // Don't fail the signup, but this is more critical now
    } else {
      console.log('Profile created/updated successfully with role:', selectedRole)
    }

    // Create worker record if role is worker
    if (selectedRole === 'worker') {
      const { error: workerError } = await supabase
        .from('workers')
        .upsert({
          user_id: authData.user.id,
          name: authData.user.email!,
          phone: '',
          tz: 'America/Toronto'
        }, {
          onConflict: 'user_id'
        })

      if (workerError) {
        console.error('Worker record creation error:', workerError)
        // Don't fail the signup, just log the error
      }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  if (authData.user && !authData.session) {
    // If user exists but no session, try to sign them in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(data)
    
    if (signInError) {
      redirect('/auth/signup?error=' + encodeURIComponent('Account may already exist. Please try signing in instead.'))
    }
    
    if (signInData.session) {
      revalidatePath('/', 'layout')
      redirect('/dashboard')
    }
  }

  redirect('/auth/signup?error=' + encodeURIComponent('Unable to create account. Please try again.'))
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const rememberMe = formData.get('remember') === 'on'

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  console.log('Attempting signin for:', data.email, 'Remember me:', rememberMe)

  // Set session persistence based on remember me
  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Signin error:', error)
    redirect('/auth/signin?error=' + encodeURIComponent(error.message))
  }

  if (authData.session) {
    console.log('User signed in successfully')
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  redirect('/auth/signin?error=' + encodeURIComponent('Unable to sign in. Please check your credentials.'))
}

export async function signOut() {
  const supabase = await createClient()
  
  console.log('Attempting signout')
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Signout error:', error)
    redirect('/dashboard?error=' + encodeURIComponent('Error signing out'))
  }

  revalidatePath('/', 'layout')
  redirect('/auth/signin')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  console.log('Attempting password reset for:', email)

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/update-password`,
  })

  if (error) {
    console.error('Password reset error:', error)
    redirect('/auth/reset-password?error=' + encodeURIComponent(error.message))
  }

  redirect('/auth/reset-password?success=' + encodeURIComponent('Check your email for password reset instructions'))
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string

  console.log('Attempting password update')

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    console.error('Password update error:', error)
    redirect('/auth/update-password?error=' + encodeURIComponent(error.message))
  }

  redirect('/dashboard?success=' + encodeURIComponent('Password updated successfully'))
} 