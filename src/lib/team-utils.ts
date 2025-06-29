/**
 * Team utility functions for working with the new members array structure
 * These functions interact with the database functions created in the migration
 */

import { createClient } from '@/lib/supabase/client'
import type { 
  Team, 
  TeamMember, 
  TeamWithStats, 
  GetTeamWithMembersResponse,
  GetAllTeamsWithMembersResponse,
  AddMemberToTeamForm 
} from '@/types/database'

/**
 * Get a team with its members array populated
 */
export async function getTeamWithMembers(teamId: string): Promise<TeamWithStats | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.rpc('get_team_with_members', {
      team_uuid: teamId
    })

    if (error) {
      console.error('Error fetching team with members:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0] as TeamWithStats
  } catch (error) {
    console.error('Error in getTeamWithMembers:', error)
    return null
  }
}

/**
 * Get all teams with their members arrays populated
 */
export async function getAllTeamsWithMembers(): Promise<TeamWithStats[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.rpc('get_all_teams_with_members')

    if (error) {
      console.error('Error fetching all teams with members:', error)
      return []
    }

    return data as TeamWithStats[] || []
  } catch (error) {
    console.error('Error in getAllTeamsWithMembers:', error)
    return []
  }
}

/**
 * Get team members filtered by role
 */
export async function getTeamMembersByRole(
  teamId: string, 
  role: 'admin' | 'sales' | 'worker'
): Promise<TeamMember[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.rpc('get_team_members_by_role', {
      team_uuid: teamId,
      member_role: role
    })

    if (error) {
      console.error('Error fetching team members by role:', error)
      return []
    }

    return data as TeamMember[] || []
  } catch (error) {
    console.error('Error in getTeamMembersByRole:', error)
    return []
  }
}

/**
 * Add a new member to a team (alternative to invitation system)
 */
export async function addMemberToTeam(memberData: AddMemberToTeamForm): Promise<TeamWithStats | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.rpc('add_member_to_team', {
      team_uuid: memberData.team_id,
      member_email: memberData.email,
      member_name: memberData.name,
      member_role: memberData.role,
      member_phone: memberData.phone || '',
      member_hourly_rate: memberData.hourly_rate || 25.00
    })

    if (error) {
      console.error('Error adding member to team:', error)
      return null
    }

    return data as TeamWithStats
  } catch (error) {
    console.error('Error in addMemberToTeam:', error)
    return null
  }
}

/**
 * Update team members array (force refresh)
 */
export async function refreshTeamMembers(teamId: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.rpc('update_team_members', {
      team_uuid: teamId
    })

    if (error) {
      console.error('Error refreshing team members:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in refreshTeamMembers:', error)
    return false
  }
}

/**
 * Get team statistics from members array
 */
export function getTeamStats(team: Team): {
  totalMembers: number
  adminCount: number
  workerCount: number
  salesCount: number
  activeMembers: number
} {
  if (!team.members || !Array.isArray(team.members)) {
    return {
      totalMembers: 0,
      adminCount: 0,
      workerCount: 0,
      salesCount: 0,
      activeMembers: 0
    }
  }

  return {
    totalMembers: team.members.length,
    adminCount: team.members.filter(m => m.role === 'admin').length,
    workerCount: team.members.filter(m => m.role === 'worker').length,
    salesCount: team.members.filter(m => m.role === 'sales').length,
    activeMembers: team.members.filter(m => m.is_active).length
  }
}

/**
 * Filter team members by various criteria
 */
export function filterTeamMembers(
  members: TeamMember[], 
  filters: {
    role?: 'admin' | 'sales' | 'worker'
    isActive?: boolean
    searchTerm?: string
  }
): TeamMember[] {
  return members.filter(member => {
    // Role filter
    if (filters.role && member.role !== filters.role) {
      return false
    }

    // Active status filter
    if (filters.isActive !== undefined && member.is_active !== filters.isActive) {
      return false
    }

    // Search term filter (name, email, phone)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      const matchesName = member.name.toLowerCase().includes(searchLower)
      const matchesEmail = member.email.toLowerCase().includes(searchLower)
      const matchesPhone = member.phone.toLowerCase().includes(searchLower)
      
      if (!matchesName && !matchesEmail && !matchesPhone) {
        return false
      }
    }

    return true
  })
}

/**
 * Sort team members by various criteria
 */
export function sortTeamMembers(
  members: TeamMember[],
  sortBy: 'name' | 'role' | 'email' | 'created_at' | 'hourly_rate',
  direction: 'asc' | 'desc' = 'asc'
): TeamMember[] {
  return [...members].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'role':
        // Sort by role hierarchy: admin > sales > worker
        const roleOrder = { admin: 1, sales: 2, worker: 3 }
        comparison = roleOrder[a.role] - roleOrder[b.role]
        break
      case 'email':
        comparison = a.email.localeCompare(b.email)
        break
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case 'hourly_rate':
        comparison = a.hourly_rate - b.hourly_rate
        break
      default:
        comparison = 0
    }

    return direction === 'desc' ? -comparison : comparison
  })
}

/**
 * Format team member data for display
 */
export function formatTeamMemberDisplay(member: TeamMember): {
  displayName: string
  roleLabel: string
  contactInfo: string
  rateInfo: string
  statusLabel: string
} {
  return {
    displayName: member.name || member.email,
    roleLabel: member.role.charAt(0).toUpperCase() + member.role.slice(1),
    contactInfo: `${member.email}${member.phone ? ` • ${member.phone}` : ''}`,
    rateInfo: `$${member.hourly_rate}/hr`,
    statusLabel: member.is_active ? 'Active' : 'Inactive'
  }
} 