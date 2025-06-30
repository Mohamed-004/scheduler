import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
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

    // Check if user has permission to remove roles
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the assignment to verify ownership
    const { data: assignment, error: assignmentError } = await supabase
      .from('worker_role_assignments')
      .select(`
        *,
        job_role:job_roles(team_id),
        worker:users(team_id)
      `)
      .eq('id', id)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 })
    }

    // Verify the assignment belongs to the same team
    if (assignment.job_role?.team_id !== userProfile.team_id || 
        assignment.worker?.team_id !== userProfile.team_id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    // Delete the assignment
    const { error } = await supabase
      .from('worker_role_assignments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting worker role assignment:', error)
      return NextResponse.json({ success: false, error: 'Failed to remove role assignment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in worker roles DELETE API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}