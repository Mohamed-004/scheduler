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

    // Check if user has permission to create clients
    if (!['admin', 'sales'].includes(userProfile.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, address, tz } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 })
    }

    // Validate name length
    if (name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Name must be at least 2 characters' }, { status: 400 })
    }

    // Validate phone format if provided
    if (phone && phone.trim()) {
      const phoneRegex = /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{7,15}$/
      if (!phoneRegex.test(phone.trim())) {
        return NextResponse.json({ success: false, error: 'Invalid phone number format' }, { status: 400 })
      }
    }

    // Check if client with this email already exists
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('email', email.toLowerCase())
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking existing client:', checkError)
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
    }

    if (existingClient) {
      return NextResponse.json({ 
        success: false, 
        error: `A client with email "${email}" already exists (${existingClient.name})` 
      }, { status: 400 })
    }

    // Validate timezone
    const validTimezones = [
      'America/Toronto', 'America/New_York', 'America/Chicago', 
      'America/Denver', 'America/Los_Angeles', 'America/Vancouver',
      'America/Edmonton', 'America/Winnipeg', 'America/Halifax'
    ]
    
    const selectedTz = tz || 'America/Toronto'
    if (!validTimezones.includes(selectedTz)) {
      return NextResponse.json({ success: false, error: 'Invalid timezone' }, { status: 400 })
    }

    // Create the client
    const { data: createdClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        tz: selectedTz,
        team_id: userProfile.team_id
      })
      .select()
      .single()

    if (clientError) {
      console.error('Error creating client:', clientError)
      
      // Handle specific database errors
      if (clientError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ success: false, error: 'A client with this email already exists' }, { status: 400 })
      }
      
      return NextResponse.json({ success: false, error: 'Failed to create client' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: createdClient,
      message: `Client "${createdClient.name}" created successfully`
    })
  } catch (error) {
    console.error('Unexpected error in clients API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}