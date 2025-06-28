'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateSecureToken } from '@/lib/utils'
// Choose your email service:
import { sendInvitationEmail } from '@/lib/email'        // SendGrid (current)  
// import { sendInvitationEmail } from '@/lib/email-gmail'  // Gmail SMTP (alternative)
import type { BusinessSignupForm, TeamMemberSignupForm } from '@/types/database'

/**
 * Business owner signup - creates team and admin user using database function
 */
export async function signUpBusiness(formData: BusinessSignupForm) {
  const supabase = await createClient()

  try {
    // 1. Create auth user with auto-confirm for development
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.owner_email,
      password: formData.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          name: formData.owner_name,
          business_name: formData.business_name,
          phone: formData.owner_phone || '',
        }
      }
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: 'Failed to create user account' }
    }

    // Check if email confirmation is required
    if (!authData.session) {
      // Email confirmation required - the callback will complete the profile creation
      return { 
        error: 'Please check your email and click the confirmation link to complete signup.',
        requiresConfirmation: true 
      }
    }

    // 2. User is immediately signed in - create team and profile now
    const { data: teamId, error: teamError } = await supabase.rpc('handle_business_signup', {
      user_id: authData.user.id,
      user_email: formData.owner_email,
      business_name: formData.business_name,
      owner_name: formData.owner_name,
      owner_phone: formData.owner_phone || ''
    })

    if (teamError) {
      return { error: `Failed to create team: ${teamError.message}` }
    }

    // 3. User is signed in and profile created
    return { success: true, team_id: teamId, signedIn: true }
  } catch (error) {
    console.error('Business signup error:', error)
    return { error: 'An unexpected error occurred during signup' }
  }
}

/**
 * Team member signup via invitation - handles all scenarios
 */
export async function signUpTeamMember(formData: TeamMemberSignupForm) {
  const supabase = await createClient()

  try {
    console.log('🔍 Starting team member signup with token:', formData.invitation_token?.substring(0, 10) + '...')

    // 1. First, get invitation details to see what email it's for
    const { data: invitationResult, error: invitationError } = await supabase.rpc('get_invitation_by_token', {
      p_token: formData.invitation_token
    })

    if (invitationError || !invitationResult?.success) {
      console.error('❌ Invalid invitation token')
      return { error: 'Invalid or expired invitation' }
    }

    const invitation = invitationResult.invitation
    console.log('📧 Invitation is for email:', invitation.email)

    // 2. Check if user is currently logged in
    const { data: currentAuth } = await supabase.auth.getUser()
    
    if (currentAuth.user) {
      console.log('👤 User is logged in:', currentAuth.user.email)
      
      // Check if logged-in user email matches invitation email
      if (currentAuth.user.email !== invitation.email) {
        console.warn('⚠️ Email mismatch! Current user:', currentAuth.user.email, 'Invitation for:', invitation.email)
        return { 
          error: `You are currently signed in as ${currentAuth.user.email}, but this invitation is for ${invitation.email}. Please sign out and sign in with the correct email.`,
          emailMismatch: true,
          currentEmail: currentAuth.user.email,
          invitationEmail: invitation.email
        }
      }

      // Email matches - proceed with invitation acceptance
      console.log('✅ Email matches, accepting invitation for logged-in user')
      const { data: result, error: acceptError } = await supabase.rpc('accept_team_invitation', {
        p_token: formData.invitation_token,
        p_user_id: currentAuth.user.id
      })

      if (acceptError || !result?.success) {
        console.error('❌ Failed to accept invitation:', acceptError?.message || result?.error)
        return { error: result?.error || acceptError?.message || 'Failed to accept invitation' }
      }

      // Update user profile with provided data
      if (formData.name || formData.phone) {
        console.log('🔄 Updating user profile with name and phone')
        const updateData: any = { updated_at: new Date().toISOString() }
        
        if (formData.name) updateData.name = formData.name
        if (formData.phone) updateData.phone = formData.phone

        await supabase.from('users').update(updateData).eq('id', currentAuth.user.id)
        console.log('✅ User profile updated')
      }

      return { success: true, team_id: result.team_id, role: result.role }
    }

    // 3. No user logged in - handle auth (sign in or sign up)
    console.log('🆕 No user logged in, handling authentication')

    if (!formData.password) {
      return { error: 'Password is required to join the team' }
    }

    // Try to sign in first (user might already have an account)
    console.log('🔑 Attempting sign in with invitation email')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password: formData.password
    })

    let userId: string

    if (signInData.user && !signInError) {
      // User successfully signed in
      userId = signInData.user.id
      console.log('✅ User signed in successfully:', userId)
    } else {
      // User doesn't exist or wrong password - create new account
      console.log('🆕 Creating new user account')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
      })

      if (signUpError) {
        console.error('❌ Failed to create account:', signUpError.message)
        return { error: signUpError.message }
      }

      if (!signUpData.user) {
        console.error('❌ No user returned from signup')
        return { error: 'Failed to create user account' }
      }

      userId = signUpData.user.id
      console.log('✅ New user account created:', userId)
    }

    // 4. Accept invitation with authenticated user
    console.log('🔄 Accepting invitation for user:', userId)
    const { data: result, error: acceptError } = await supabase.rpc('accept_team_invitation', {
      p_token: formData.invitation_token,
      p_user_id: userId
    })

    if (acceptError || !result?.success) {
      console.error('❌ Failed to accept invitation:', acceptError?.message || result?.error)
      return { error: result?.error || acceptError?.message || 'Failed to accept invitation' }
    }

    // 5. Update user profile with provided data
    if (formData.name || formData.phone) {
      console.log('🔄 Updating user profile with name and phone')
      const updateData: any = { updated_at: new Date().toISOString() }
      
      if (formData.name) updateData.name = formData.name
      if (formData.phone) updateData.phone = formData.phone

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (updateError) {
        console.warn('⚠️ Failed to update user profile:', updateError.message)
      } else {
        console.log('✅ User profile updated successfully')
      }
    }

    console.log('🎉 Team member signup completed successfully')
    return { success: true, team_id: result.team_id, role: result.role }
    
  } catch (error) {
    console.error('❌ Team member signup error:', error)
    return { error: 'An unexpected error occurred during signup' }
  }
}

/**
 * Send team invitation
 */
export async function inviteTeamMember(email: string, role: 'admin' | 'sales' | 'worker', name?: string) {
  const supabase = await createClient()

  try {
    // Get current user's team info
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return { error: 'Not authenticated' }
    }

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('team_id, role, name')
      .eq('id', userData.user.id)
      .single()

    if (userError || !currentUser) {
      return { error: 'Failed to get current user' }
    }

    // Check permissions
    if (!['admin', 'sales'].includes(currentUser.role)) {
      return { error: 'Insufficient permissions to invite team members' }
    }

    // Check if email is already invited or is a team member
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('team_id', currentUser.team_id)
      .single()

    if (existingUser) {
      return { error: 'User is already a team member' }
    }

    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('email', email)
      .eq('team_id', currentUser.team_id)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return { error: 'User already has a pending invitation' }
    }

    // Generate secure token
    const token = generateSecureToken()

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: currentUser.team_id,
        email,
        role,
        invited_by: userData.user.id,
        token,
        name,
      })
      .select()
      .single()

    if (inviteError) {
      return { error: `Failed to create invitation: ${inviteError.message}` }
    }

    // Send email (implement this function)
    try {
      const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/invite?token=${token}`
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      
      await sendInvitationEmail({
        email,
        name,
        role,
        inviterName: currentUser.name,
        invitationUrl,
        expiresAt
      })
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the invitation if email fails
    }

    return { success: true, invitation }
  } catch (error) {
    console.error('Invite team member error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get invitation details by token
 */
export async function getInvitationByToken(token: string) {
  const supabase = await createClient()

  try {
    const { data: result, error } = await supabase.rpc('get_invitation_by_token', {
      p_token: token
    })

    if (error || !result?.success) {
      return { error: result?.error || 'Invalid or expired invitation' }
    }

    return { success: true, invitation: result.invitation }
  } catch (error) {
    return { error: 'Failed to get invitation details' }
  }
}

/**
 * Standard sign in
 */
export async function signIn(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/signin')
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Update password
 */
export async function updatePassword(password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Accept invitation (for existing users)
 */
export async function acceptInvitation(token: string) {
  const supabase = await createClient()

  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return { error: 'Not authenticated' }
    }

    // Use database function to accept invitation
    const { data: result, error } = await supabase.rpc('accept_team_invitation', {
      p_token: token,
      p_user_id: userData.user.id
    })

    if (error || !result?.success) {
      return { error: result?.error || error?.message || 'Failed to accept invitation' }
    }

    return { success: true, team_id: result.team_id, role: result.role }
  } catch (error) {
    return { error: 'An unexpected error occurred' }
  }
}

 