// Database table types for the team-based scheduler system

// Team types (matches new schema)
export interface Team {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

// Updated User interface (matches new consolidated schema)
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

// Job interface (matches new schema exactly)
export interface Job {
  id: string
  team_id: string
  client_id: string
  assigned_worker_id?: string
  address: string
  job_type: string
  estimated_hours: number
  quote_amount: number
  equipment_required: string[] // JSON array
  status: JobStatus
  start_time?: string
  end_time?: string
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

// Legacy types (for backward compatibility during migration)
export interface Worker {
  id: string
  user_id: string
  name: string
  phone: string
  rating: number
  weekly_hours: number
  tz: string
  is_active: boolean
  created_at: string
  updated_at: string
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
  estimated_hours: number
  quote_amount: number
  equipment_required?: string[]
  start_time?: string
  end_time?: string
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

// Dashboard stats for team-scoped data
export interface TeamDashboardStats {
  team: Team
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
  error?: string
} 