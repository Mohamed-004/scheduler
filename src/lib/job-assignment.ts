import { createClient } from '@/lib/supabase/client'
import { 
  getOptimalCrewAssignment, 
  findAvailableWorkers,
  type JobRequirement,
  type TimeSlot 
} from '@/lib/worker-availability'

export interface JobData {
  client_id: string
  job_type: string
  address: string
  estimated_hours: number
  quote_amount: number
  start?: Date
  finish?: Date
  notes?: string
  equipment_required?: string[]
}

export interface AssignmentSuggestion {
  type: 'crew' | 'individual'
  crew_id?: string
  crew_name?: string
  workers: Array<{
    worker_id: string
    worker_name: string
    job_role_id: string
    role_name: string
    suggested_rate: number
    score: number
    is_lead: boolean
  }>
  total_score: number
  estimated_cost: number
  conflicts: string[]
  alternatives?: AssignmentSuggestion[]
}

export interface CrewCapability {
  crew_id: string
  crew_name: string
  role_capabilities: Array<{
    job_role_id: string
    capacity: number
    proficiency_level: number
  }>
  members: Array<{
    worker_id: string
    worker_name: string
  }>
}

/**
 * Get available crews that can handle the job requirements
 */
export async function getAvailableCrews(
  requirements: JobRequirement[],
  timeSlot: TimeSlot,
  teamId: string
): Promise<Array<{
  crew: CrewCapability
  assignment_score: number
  can_fulfill: boolean
  missing_roles: JobRequirement[]
}>> {
  const supabase = createClient()

  try {
    // Get all active crews with their capabilities and members
    const { data: crews } = await supabase
      .from('crews')
      .select(`
        id,
        name,
        is_active,
        crew_role_capabilities (
          job_role_id,
          capacity,
          proficiency_level,
          job_role:job_roles (
            id,
            name,
            hourly_rate_base
          )
        ),
        crew_workers (
          worker_id,
          worker:workers (
            id,
            name,
            user:users (team_id)
          )
        )
      `)
      .eq('is_active', true)
      .eq('crew_workers.worker.user.team_id', teamId)

    if (!crews || crews.length === 0) {
      return []
    }

    const crewAssignments: Array<{
      crew: CrewCapability
      assignment_score: number
      can_fulfill: boolean
      missing_roles: JobRequirement[]
    }> = []

    for (const crew of crews) {
      const crewCapability: CrewCapability = {
        crew_id: crew.id,
        crew_name: crew.name,
        role_capabilities: crew.crew_role_capabilities || [],
        members: (crew.crew_workers || []).map((cw: any) => ({
          worker_id: cw.worker_id,
          worker_name: cw.worker?.name || 'Unknown'
        }))
      }

      // Check if crew can fulfill requirements
      const missingRoles: JobRequirement[] = []
      let totalScore = 0
      let rolesChecked = 0

      for (const requirement of requirements) {
        const capability = crewCapability.role_capabilities.find(
          cap => cap.job_role_id === requirement.job_role_id
        )

        if (!capability) {
          missingRoles.push(requirement)
        } else if (capability.capacity < requirement.quantity_required) {
          missingRoles.push({
            ...requirement,
            quantity_required: requirement.quantity_required - capability.capacity
          })
          // Partial fulfillment gets partial score
          totalScore += (capability.capacity / requirement.quantity_required) * 80
          rolesChecked++
        } else {
          // Full capability - check proficiency
          const proficiencyScore = capability.proficiency_level * 20
          const capacityBonus = capability.capacity >= requirement.quantity_required ? 10 : 0
          totalScore += proficiencyScore + capacityBonus
          rolesChecked++
        }
      }

      const averageScore = rolesChecked > 0 ? totalScore / rolesChecked : 0

      crewAssignments.push({
        crew: crewCapability,
        assignment_score: Math.round(averageScore),
        can_fulfill: missingRoles.length === 0,
        missing_roles: missingRoles
      })
    }

    // Sort by ability to fulfill and score
    return crewAssignments.sort((a, b) => {
      if (a.can_fulfill && !b.can_fulfill) return -1
      if (!a.can_fulfill && b.can_fulfill) return 1
      return b.assignment_score - a.assignment_score
    })
  } catch (error) {
    console.error('Error getting available crews:', error)
    return []
  }
}

/**
 * Generate assignment suggestions for a job
 */
export async function generateAssignmentSuggestions(
  jobData: JobData,
  requirements: JobRequirement[],
  teamId: string
): Promise<AssignmentSuggestion[]> {
  if (!jobData.start || !jobData.finish) {
    // If no time specified, suggest best workers anyway
    return await generateIndividualAssignmentSuggestions(requirements, teamId)
  }

  const timeSlot: TimeSlot = {
    start: jobData.start,
    end: jobData.finish
  }

  const suggestions: AssignmentSuggestion[] = []

  try {
    // 1. Check for crew assignments first
    const crewOptions = await getAvailableCrews(requirements, timeSlot, teamId)
    
    for (const crewOption of crewOptions.slice(0, 2)) { // Top 2 crew options
      if (crewOption.can_fulfill) {
        const crewSuggestion = await buildCrewAssignmentSuggestion(
          crewOption.crew,
          requirements,
          jobData,
          timeSlot
        )
        if (crewSuggestion) {
          suggestions.push(crewSuggestion)
        }
      }
    }

    // 2. Generate individual worker assignments
    const individualSuggestions = await generateIndividualAssignmentSuggestions(
      requirements,
      teamId,
      timeSlot
    )
    
    suggestions.push(...individualSuggestions.slice(0, 2)) // Top 2 individual options

    // Sort by total score
    return suggestions.sort((a, b) => b.total_score - a.total_score)
  } catch (error) {
    console.error('Error generating assignment suggestions:', error)
    return []
  }
}

/**
 * Build crew assignment suggestion
 */
async function buildCrewAssignmentSuggestion(
  crew: CrewCapability,
  requirements: JobRequirement[],
  jobData: JobData,
  timeSlot: TimeSlot
): Promise<AssignmentSuggestion | null> {
  const supabase = createClient()

  try {
    const workers: AssignmentSuggestion['workers'] = []
    let totalCost = 0
    let totalScore = 0
    const conflicts: string[] = []

    // Assign workers based on crew capabilities
    for (const requirement of requirements) {
      const capability = crew.role_capabilities.find(
        cap => cap.job_role_id === requirement.job_role_id
      )

      if (!capability) continue

      // Get role details
      const { data: jobRole } = await supabase
        .from('job_roles')
        .select('name, hourly_rate_base')
        .eq('id', requirement.job_role_id)
        .single()

      if (!jobRole) continue

      // Assign workers from crew for this role
      const workersToAssign = Math.min(capability.capacity, requirement.quantity_required)
      const availableCrewMembers = crew.members.slice(0, workersToAssign)

      for (let i = 0; i < workersToAssign; i++) {
        const member = availableCrewMembers[i]
        if (member) {
          const suggestedRate = jobRole.hourly_rate_base || 25
          const memberScore = capability.proficiency_level * 20

          workers.push({
            worker_id: member.worker_id,
            worker_name: member.worker_name,
            job_role_id: requirement.job_role_id,
            role_name: jobRole.name,
            suggested_rate: suggestedRate,
            score: memberScore,
            is_lead: workers.length === 0 // First worker is lead
          })

          totalCost += suggestedRate * jobData.estimated_hours
          totalScore += memberScore
        }
      }
    }

    const averageScore = workers.length > 0 ? totalScore / workers.length : 0

    return {
      type: 'crew',
      crew_id: crew.crew_id,
      crew_name: crew.crew_name,
      workers,
      total_score: Math.round(averageScore),
      estimated_cost: totalCost,
      conflicts
    }
  } catch (error) {
    console.error('Error building crew assignment suggestion:', error)
    return null
  }
}

/**
 * Generate individual worker assignment suggestions
 */
async function generateIndividualAssignmentSuggestions(
  requirements: JobRequirement[],
  teamId: string,
  timeSlot?: TimeSlot
): Promise<AssignmentSuggestion[]> {
  const suggestions: AssignmentSuggestion[] = []

  try {
    // Get optimal assignment
    if (timeSlot) {
      const optimalAssignment = await getOptimalCrewAssignment(requirements, timeSlot, teamId)
      
      if (optimalAssignment.success && optimalAssignment.assignments.length > 0) {
        const supabase = createClient()
        const workers: AssignmentSuggestion['workers'] = []
        let totalCost = 0

        for (const assignment of optimalAssignment.assignments) {
          // Get role name
          const { data: jobRole } = await supabase
            .from('job_roles')
            .select('name')
            .eq('id', assignment.job_role_id)
            .single()

          workers.push({
            worker_id: assignment.worker_id,
            worker_name: assignment.worker_name,
            job_role_id: assignment.job_role_id,
            role_name: jobRole?.name || 'Unknown Role',
            suggested_rate: assignment.suggested_rate,
            score: assignment.score,
            is_lead: assignment.is_lead
          })

          totalCost += assignment.suggested_rate * 8 // Estimate 8 hours if not specified
        }

        suggestions.push({
          type: 'individual',
          workers,
          total_score: optimalAssignment.totalScore,
          estimated_cost: totalCost,
          conflicts: []
        })
      }
    } else {
      // No time slot specified - suggest best qualified workers
      for (const requirement of requirements) {
        const availableWorkers = await findAvailableWorkers(
          requirement.job_role_id,
          { start: new Date(), end: new Date() }, // Dummy time slot
          teamId
        )

        const bestWorkers = availableWorkers.slice(0, requirement.quantity_required)
        
        if (bestWorkers.length > 0) {
          const supabase = createClient()
          const workers: AssignmentSuggestion['workers'] = []
          let totalCost = 0
          let totalScore = 0

          for (let i = 0; i < bestWorkers.length; i++) {
            const worker = bestWorkers[i]
            
            // Get role name
            const { data: jobRole } = await supabase
              .from('job_roles')
              .select('name')
              .eq('id', requirement.job_role_id)
              .single()

            workers.push({
              worker_id: worker.worker_id,
              worker_name: worker.worker_name,
              job_role_id: requirement.job_role_id,
              role_name: jobRole?.name || 'Unknown Role',
              suggested_rate: worker.suggested_rate,
              score: worker.score,
              is_lead: i === 0 && suggestions.length === 0 // First worker of first role
            })

            totalCost += worker.suggested_rate * 8
            totalScore += worker.score
          }

          if (workers.length > 0) {
            suggestions.push({
              type: 'individual',
              workers,
              total_score: Math.round(totalScore / workers.length),
              estimated_cost: totalCost,
              conflicts: []
            })
          }
        }
      }
    }

    return suggestions
  } catch (error) {
    console.error('Error generating individual assignment suggestions:', error)
    return []
  }
}

/**
 * Auto-assign workers to a job based on requirements
 */
export async function autoAssignWorkers(
  jobId: string,
  requirements: JobRequirement[],
  timeSlot: TimeSlot,
  teamId: string,
  preferredAssignment?: 'crew' | 'individual'
): Promise<{
  success: boolean
  assignments: Array<{
    worker_id: string
    job_role_id: string
    hourly_rate: number
    is_lead: boolean
  }>
  message: string
}> {
  try {
    const suggestions = await generateAssignmentSuggestions(
      { 
        client_id: '', 
        job_type: '', 
        address: '', 
        estimated_hours: 8, 
        quote_amount: 0,
        start: timeSlot.start,
        finish: timeSlot.end
      },
      requirements,
      teamId
    )

    if (suggestions.length === 0) {
      return {
        success: false,
        assignments: [],
        message: 'No suitable workers found for the specified requirements'
      }
    }

    // Choose best suggestion based on preference
    let bestSuggestion = suggestions[0]
    if (preferredAssignment) {
      const preferredSuggestion = suggestions.find(s => s.type === preferredAssignment)
      if (preferredSuggestion) {
        bestSuggestion = preferredSuggestion
      }
    }

    // Convert to assignment format
    const assignments = bestSuggestion.workers.map(worker => ({
      worker_id: worker.worker_id,
      job_role_id: worker.job_role_id,
      hourly_rate: worker.suggested_rate,
      is_lead: worker.is_lead
    }))

    // Create worker role assignments in database
    const supabase = createClient()
    const assignmentData = assignments.map(assignment => ({
      job_id: jobId,
      worker_id: assignment.worker_id,
      job_role_id: assignment.job_role_id,
      hourly_rate: assignment.hourly_rate,
      is_lead: assignment.is_lead,
      assigned_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('worker_role_assignments')
      .insert(assignmentData)

    if (error) {
      console.error('Error creating worker assignments:', error)
      return {
        success: false,
        assignments: [],
        message: 'Failed to create worker assignments'
      }
    }

    return {
      success: true,
      assignments,
      message: `Successfully assigned ${assignments.length} worker${assignments.length !== 1 ? 's' : ''} to the job`
    }
  } catch (error) {
    console.error('Error auto-assigning workers:', error)
    return {
      success: false,
      assignments: [],
      message: 'An error occurred while assigning workers'
    }
  }
}