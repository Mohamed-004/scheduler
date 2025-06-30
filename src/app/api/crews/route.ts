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

    // Check if user has permission to create crews
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { crew, workers, capabilities } = body

    // Validate required fields
    if (!crew?.name || !workers || !Array.isArray(workers)) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Validate crew name length
    if (crew.name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Crew name must be at least 2 characters' }, { status: 400 })
    }

    // Check if crew name already exists (basic check without team_id for now)
    const { data: existingCrew, error: checkError } = await supabase
      .from('crews')
      .select('id')
      .eq('name', crew.name.trim())
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking existing crew:', checkError)
    }

    if (existingCrew) {
      return NextResponse.json({ success: false, error: 'A crew with this name already exists' }, { status: 400 })
    }

    // Verify all workers exist and belong to the same team
    if (workers.length > 0) {
      const workerIds = workers.map((w: any) => w.worker_id)
      const { data: workerCheck, error: workerError } = await supabase
        .from('workers')
        .select('id, user_id, user:users(team_id)')
        .in('id', workerIds)

      if (workerError) {
        console.error('Error verifying workers:', workerError)
        return NextResponse.json({ success: false, error: 'Error verifying workers' }, { status: 500 })
      }

      if (!workerCheck || workerCheck.length !== workerIds.length) {
        return NextResponse.json({ success: false, error: 'Some workers were not found' }, { status: 400 })
      }

      // Check if all workers belong to the same team
      const invalidWorkers = workerCheck?.filter((w: any) => w.user?.team_id !== userProfile.team_id)
      if (invalidWorkers && invalidWorkers.length > 0) {
        return NextResponse.json({ success: false, error: 'Some workers do not belong to your team' }, { status: 400 })
      }
    }

    // Create the crew (without team_id for now due to schema constraints)
    const { data: createdCrew, error: crewError } = await supabase
      .from('crews')
      .insert({
        name: crew.name.trim(),
        description: crew.description?.trim() || null,
        is_active: crew.is_active !== false
      })
      .select()
      .single()

    if (crewError) {
      console.error('Error creating crew:', crewError)
      return NextResponse.json({ success: false, error: 'Failed to create crew' }, { status: 500 })
    }

    // Add crew members
    if (workers.length > 0) {
      const crewWorkersData = workers.map((w: any) => ({
        crew_id: createdCrew.id,
        worker_id: w.worker_id
      }))

      const { error: workersError } = await supabase
        .from('crew_workers')
        .insert(crewWorkersData)

      if (workersError) {
        console.error('Error adding crew members:', workersError)
        // Cleanup: delete the created crew if we can't add workers
        await supabase.from('crews').delete().eq('id', createdCrew.id)
        return NextResponse.json({ success: false, error: 'Failed to add crew members' }, { status: 500 })
      }
    }

    // Add role capabilities if provided
    if (capabilities && Array.isArray(capabilities) && capabilities.length > 0) {
      const validCapabilities = capabilities.filter((cap: any) => cap.job_role_id)
      
      if (validCapabilities.length > 0) {
        // Verify all roles belong to the same team
        const roleIds = validCapabilities.map((cap: any) => cap.job_role_id)
        const { data: roleCheck, error: roleError } = await supabase
          .from('job_roles')
          .select('id, team_id')
          .in('id', roleIds)

        if (roleError) {
          console.error('Error verifying roles:', roleError)
        } else {
          const invalidRoles = roleCheck?.filter((r: any) => r.team_id !== userProfile.team_id)
          
          if (!invalidRoles || invalidRoles.length === 0) {
            const capabilitiesData = validCapabilities.map((cap: any) => ({
              crew_id: createdCrew.id,
              job_role_id: cap.job_role_id,
              capacity: Math.max(1, parseInt(cap.capacity) || 1),
              proficiency_level: Math.min(5, Math.max(1, parseInt(cap.proficiency_level) || 3))
            }))

            const { error: capError } = await supabase
              .from('crew_role_capabilities')
              .insert(capabilitiesData)

            if (capError) {
              console.error('Error adding role capabilities:', capError)
              // Don't fail the entire request if capabilities fail
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: createdCrew,
      message: `Crew "${createdCrew.name}" created successfully with ${workers.length} member${workers.length !== 1 ? 's' : ''}`
    })
  } catch (error) {
    console.error('Unexpected error in crews API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}