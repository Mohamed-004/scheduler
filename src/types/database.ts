// Database table types for the team-based scheduler system

// Team member interface (for the JSONB array in teams table)
export interface TeamMember {
  id: string
  email: string
  name: string
  role: 'admin' | 'sales' | 'worker'
  phone: string
  hourly_rate: number
  tz: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Enhanced Team types (matches new schema with members array)
export interface Team {
  id: string
  name: string
  description?: string
  members: TeamMember[] // New JSONB array with all team members
  created_at: string
  updated_at: string
}

// Extended Team interface with computed stats
export interface TeamWithStats extends Team {
  member_count: number
  admin_count: number
  worker_count: number
}

// Updated User interface (matches enhanced schema)
export interface User {
  id: string
  email: string
  team_id: string
  role: 'admin' | 'sales' | 'worker'
  name: string
  phone: string
  hourly_rate: number
  tz: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Team-scoped Client interface (matches new schema)
export interface Client {
  id: string
  team_id: string
  name: string
  phone: string
  email?: string
  address?: string
  tz: string
  created_at: string
  updated_at: string
}

// Job status type (matches new schema exactly)
export type JobStatus = 
  | 'PENDING'
  | 'SCHEDULED' 
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

// Enhanced Job interface with separate date/time fields
export interface Job {
  id: string
  team_id: string
  client_id: string
  assigned_worker_id?: string
  address: string
  job_type: string
  quote_amount: number
  remaining_balance: number
  equipment_required: string[] // JSON array
  status: JobStatus
  // Enhanced scheduling fields
  scheduled_date?: string // DATE
  start_time?: string // TIME
  end_time?: string // TIME
  duration_hours?: number // Calculated field
  payable_hours?: number
  actual_duration?: number
  // Legacy fields for backwards compatibility
  scheduled_start?: string
  scheduled_end?: string
  actual_start?: string
  actual_end?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Team invitation interface (matches new schema exactly)
export interface TeamInvitation {
  id: string
  team_id: string
  email: string
  role: 'admin' | 'sales' | 'worker'
  invited_by: string
  token: string
  name?: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at: string
  accepted_at?: string
  created_at: string
  updated_at: string
}

// Worker type with availability fields
export interface Worker {
  id: string
  user_id: string
  name: string
  phone: string
  rating: number
  weekly_hours: number
  specialties: string[]
  default_schedule: WorkerSchedule
  schedule_exceptions: ScheduleException[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// Worker schedule types
export interface WorkerSchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export interface DaySchedule {
  start: string // HH:MM format
  end: string   // HH:MM format
  available: boolean
}

export interface ScheduleException {
  date: string // YYYY-MM-DD format
  start?: string // HH:MM format
  end?: string   // HH:MM format
  available: boolean
  reason?: string
}


// Job scheduling validation result
export interface SchedulingValidation {
  valid: boolean
  total_workers: number
  available_workers: number
  required_workers: number
  conflicts: number
  suggestions: string[]
}

// Scheduling suggestions
export interface SchedulingSuggestions {
  available_slots: string[]
  best_times: string[]
}

// Enhanced job creation data
export interface JobCreationData {
  client_id: string
  job_type: string
  address: string
  quote_amount: number
  remaining_balance: number
  scheduled_date?: string
  start_time?: string
  end_time?: string
  payable_hours?: number
  equipment_required?: string[]
  notes?: string
}

// Worker pay rate update data
export interface PayRateUpdateData {
  hourly_rate: number
  reason?: string
}

export interface Crew {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Enhanced types with relations
export interface JobWithRelations extends Job {
  client: Client
  assigned_worker?: User
  team: Team
}

export interface UserWithTeam extends User {
  team: Team
}

export interface TeamWithMembers extends Team {
  members: User[]
}

// API Response types
export interface ApiResponse<T> {
  data: T
  error?: string
  success: boolean
}

// Database function response types for team operations
export interface GetTeamWithMembersResponse {
  id: string
  name: string
  description?: string
  members: TeamMember[]
  member_count: number
  admin_count: number
  worker_count: number
  created_at: string
  updated_at: string
}

export interface GetAllTeamsWithMembersResponse extends Array<{
  id: string
  name: string
  description?: string
  members: TeamMember[]
  member_count: number
  admin_count: number
  worker_count: number
  created_at: string
  updated_at: string
}> {}

// Form types for team-based operations
export interface BusinessSignupForm {
  business_name: string
  owner_name: string
  owner_email: string
  owner_phone?: string
  password: string
}

export interface TeamMemberSignupForm {
  invitation_token: string
  name: string
  phone: string
  password?: string // Optional for existing users
}

export interface CreateJobForm {
  client_id: string
  assigned_worker_id?: string
  address: string
  job_type: string
  quote_amount: number
  remaining_balance: number
  equipment_required?: string[]
  scheduled_start?: string
  scheduled_end?: string
  notes?: string
}

export interface CreateClientForm {
  name: string
  phone: string
  email?: string
  address?: string
  tz?: string
}

export interface CreateUserForm {
  email: string
  name: string
  phone: string
  role: 'admin' | 'sales' | 'worker'
  hourly_rate?: number
}

export interface TeamInvitationForm {
  email: string
  role: 'admin' | 'sales' | 'worker'
  name?: string
}

export interface AddMemberToTeamForm {
  team_id: string
  email: string
  name: string
  role: 'admin' | 'sales' | 'worker'
  phone?: string
  hourly_rate?: number
}

// Dashboard stats for team-scoped data
export interface TeamDashboardStats {
  team: TeamWithStats
  total_jobs: number
  active_jobs: number
  completed_jobs: number
  pending_jobs: number
  total_team_members: number
  active_workers: number
  total_clients: number
  recent_jobs: JobWithRelations[]
}

// Database function response types
export interface BusinessSignupResponse {
  team_id: string
}

export interface InvitationAcceptResponse {
  success: boolean
  team_id?: string
  role?: string
} 