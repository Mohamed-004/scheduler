import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 })
    }

    // Get the capability
    const { data: capability, error } = await supabase
      .from('worker_capabilities')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !capability) {
      return NextResponse.json({ success: false, error: 'Capability not found' }, { status: 404 })
    }

    // Get job role separately to avoid relationship ambiguity
    const { data: jobRole } = await supabase
      .from('job_roles')
      .select('id, name, description, color_code')
      .eq('id', capability.job_role_id)
      .single()

    const capabilityWithRole = {
      ...capability,
      job_role: jobRole || null
    }
    
    return NextResponse.json({ success: true, data: capabilityWithRole })
  } catch (error) {
    console.error('❌ GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔄 PUT /api/worker-capabilities/[id] called')
  try {
    const supabase = await createClient()
    const { id } = await params
    console.log('📝 PUT request for ID:', id)
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('🔍 PUT Auth check:', { user: user?.id, userError })
    if (userError || !user) {
      console.log('❌ User authentication failed:', userError)
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 })
    }

    // Get user profile for role checking
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      console.log('❌ User profile not found:', profileError)
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // Check if user has permission to update capabilities
    if (!['admin', 'sales'].includes(userProfile.role)) {
      console.log('❌ Insufficient permissions for user role:', userProfile.role)
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { is_lead, proficiency_level, notes } = body
    console.log('📦 Request body:', body)

    // Validate proficiency level if provided
    if (proficiency_level !== undefined && (proficiency_level < 1 || proficiency_level > 5)) {
      return NextResponse.json({ success: false, error: 'Proficiency level must be between 1 and 5' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: any = {}
    if (is_lead !== undefined) updateData.is_lead = is_lead
    if (proficiency_level !== undefined) updateData.proficiency_level = proficiency_level
    if (notes !== undefined) updateData.notes = notes
    updateData.updated_at = new Date().toISOString()

    console.log('🔄 Updating with data:', updateData)

    // Update the capability directly - RLS policies will handle access control
    const { data: updatedCapability, error: updateError } = await supabase
      .from('worker_capabilities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    // Get job role separately to avoid relationship ambiguity
    let capabilityWithRole = updatedCapability
    if (updatedCapability && !updateError) {
      const { data: jobRole } = await supabase
        .from('job_roles')
        .select('id, name, description, color_code')
        .eq('id', updatedCapability.job_role_id)
        .single()
      
      capabilityWithRole = {
        ...updatedCapability,
        job_role: jobRole || null
      }
    }

    console.log('📊 Update result:', { updatedCapability, updateError })

    // If no rows were affected, the record doesn't exist or user doesn't have access
    if (updateError || !updatedCapability) {
      console.log('❌ Update failed - likely RLS policy block:', updateError)
      if (updateError?.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Capability not found or access denied' }, { status: 404 })
      }
      return NextResponse.json({ success: false, error: updateError?.message || 'Update failed' }, { status: 500 })
    }

    console.log('✅ Successfully updated capability')
    return NextResponse.json({ success: true, data: capabilityWithRole })
  } catch (error) {
    console.error('❌ Unexpected error in worker capabilities PUT API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🗑️ DELETE /api/worker-capabilities/[id] called')
  try {
    const supabase = await createClient()
    const { id } = await params
    console.log('🗑️ DELETE request for ID:', id)
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('🔍 DELETE Auth check:', { user: user?.id, userError })
    if (userError || !user) {
      console.log('❌ User authentication failed:', userError)
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 })
    }

    // Get user profile for role checking
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      console.log('❌ User profile not found:', profileError)
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // Check if user has permission to remove capabilities
    if (!['admin', 'sales'].includes(userProfile.role)) {
      console.log('❌ Insufficient permissions for user role:', userProfile.role)
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete the capability directly - RLS policies will handle access control
    const { data: deletedRows, error } = await supabase
      .from('worker_capabilities')
      .delete()
      .eq('id', id)
      .select('id')

    console.log('📊 Delete result:', { deletedRows, error })

    // If no rows were affected, the record doesn't exist or user doesn't have access
    if (error) {
      console.error('❌ Error deleting worker capability:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Capability not found or access denied' }, { status: 404 })
      }
      return NextResponse.json({ success: false, error: 'Failed to remove capability' }, { status: 500 })
    }

    if (!deletedRows || deletedRows.length === 0) {
      console.log('❌ No rows deleted - likely RLS policy block')
      return NextResponse.json({ success: false, error: 'Capability not found or access denied' }, { status: 404 })
    }

    console.log('✅ Successfully deleted capability')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Unexpected error in worker capabilities DELETE API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}