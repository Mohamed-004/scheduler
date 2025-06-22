// Database table types for the scheduler system

export interface User {
  id: string
  email: string
  role: 'admin' | 'sales' | 'worker'
  tz: string // IANA timezone string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  tz: string // Client's timezone
  created_at: string
  updated_at: string
}

export interface Worker {
  id: string
  user_id: string
  name: string
  phone: string
  rating: number // 1-5 stars
  weekly_hours: number
  tz: string // Worker's timezone
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

export interface CrewWorker {
  id: string
  crew_id: string
  worker_id: string
  created_at: string
}

export type JobStatus = 
  | 'PENDING'
  | 'SCHEDULED' 
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export interface Job {
  id: string
  client_id: string
  crew_id?: string
  address: string
  job_type: string
  estimated_hours: number
  quote_amount: number
  equipment_required: string[] // JSON array
  status: JobStatus
  start: string // UTC timestamp
  finish?: string // UTC timestamp
  notes?: string
  created_at: string
  updated_at: string
}

export interface TimelineItem {
  id: string
  job_id: string
  worker_id: string
  start: string // UTC timestamp
  finish?: string // UTC timestamp
  notes?: string
  created_at: string
  updated_at: string
}

// Expanded types with relations
export interface JobWithRelations extends Job {
  client: Client
  crew?: CrewWithWorkers
  timeline_items: TimelineItem[]
}

export interface CrewWithWorkers extends Crew {
  crew_workers: Array<{
    worker: Worker
  }>
}

export interface WorkerWithJobs extends Worker {
  timeline_items: Array<{
    job: JobWithRelations
  }>
}

// API Response types
export interface ApiResponse<T> {
  data: T
  error?: string
  success: boolean
}

// Form types
export interface CreateJobForm {
  client_id: string
  address: string
  job_type: string
  estimated_hours: number
  quote_amount: number
  equipment_required: string[]
  start: string
  notes?: string
}

export interface CreateClientForm {
  name: string
  phone: string
  email?: string
  address?: string
  tz: string
}

export interface CreateWorkerForm {
  name: string
  phone: string
  tz: string
}

export interface CreateCrewForm {
  name: string
  description?: string
  worker_ids: string[]
} 