import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 })
    }

    // Get user profile for role checking
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // Check if user has permission to assign capabilities
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { worker_id, job_role_id, is_lead, proficiency_level } = body

    // Validate required fields
    if (!worker_id || !job_role_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the worker belongs to the same team
    const { data: workerData, error: workerError } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', worker_id)
      .single()

    if (workerError || !workerData || workerData.team_id !== userProfile.team_id) {
      return NextResponse.json({ success: false, error: 'Worker not found or access denied' }, { status: 404 })
    }

    // Verify the job role belongs to the same team
    const { data: roleData, error: roleError } = await supabase
      .from('job_roles')
      .select('team_id')
      .eq('id', job_role_id)
      .single()

    if (roleError || !roleData || roleData.team_id !== userProfile.team_id) {
      return NextResponse.json({ success: false, error: 'Job role not found or access denied' }, { status: 404 })
    }

    // Insert the worker capability
    const { data, error } = await supabase
      .from('worker_capabilities')
      .insert({
        worker_id: worker_id,
        job_role_id: job_role_id,
        is_lead: is_lead || false,
        proficiency_level: proficiency_level || 1,
        assigned_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating worker capability:', error)
      return NextResponse.json({ success: false, error: 'Failed to assign capability' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error in worker capabilities API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}