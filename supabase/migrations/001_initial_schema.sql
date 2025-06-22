-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Custom types
CREATE TYPE user_role AS ENUM ('admin', 'sales', 'worker');
CREATE TYPE job_status AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'worker',
    tz TEXT NOT NULL DEFAULT 'America/Toronto',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE public.clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    tz TEXT NOT NULL DEFAULT 'America/Toronto',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workers table
CREATE TABLE public.workers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    rating DECIMAL(2,1) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
    weekly_hours INTEGER DEFAULT 0,
    tz TEXT NOT NULL DEFAULT 'America/Toronto',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crews table
CREATE TABLE public.crews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crew-Worker junction table
CREATE TABLE public.crew_workers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crew_id, worker_id)
);

-- Jobs table
CREATE TABLE public.jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL,
    address TEXT NOT NULL,
    job_type TEXT NOT NULL,
    estimated_hours DECIMAL(4,2) NOT NULL CHECK (estimated_hours > 0),
    quote_amount DECIMAL(10,2) NOT NULL CHECK (quote_amount >= 0),
    equipment_required JSONB DEFAULT '[]'::jsonb,
    status job_status DEFAULT 'PENDING',
    start TIMESTAMPTZ,
    finish TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (finish IS NULL OR finish > start)
);

-- Timeline items table
CREATE TABLE public.timeline_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
    start TIMESTAMPTZ NOT NULL,
    finish TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_timeline_range CHECK (finish IS NULL OR finish > start)
);

-- Indexes for performance
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX idx_jobs_crew_id ON public.jobs(crew_id);
CREATE INDEX idx_jobs_start ON public.jobs(start);
CREATE INDEX idx_timeline_items_job_id ON public.timeline_items(job_id);
CREATE INDEX idx_timeline_items_worker_id ON public.timeline_items(worker_id);
CREATE INDEX idx_timeline_items_start ON public.timeline_items(start);
CREATE INDEX idx_crew_workers_crew_id ON public.crew_workers(crew_id);
CREATE INDEX idx_crew_workers_worker_id ON public.crew_workers(worker_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crews_updated_at BEFORE UPDATE ON public.crews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timeline_items_updated_at BEFORE UPDATE ON public.timeline_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Users can only see their own record
CREATE POLICY "Users can view own record" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Admin and sales can see all users
CREATE POLICY "Admin and sales can view all users" ON public.users FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'sales')
);

-- Clients: Only admins, sales can manage clients
CREATE POLICY "Admin and sales can manage clients" ON public.clients FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'sales')
);

-- Workers: Workers can see their own record, admins and sales can see all
CREATE POLICY "Workers can view own record" ON public.workers FOR SELECT USING (
    auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'sales')
);

CREATE POLICY "Admin and sales can manage workers" ON public.workers FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'sales')
);

-- Crews: Admin and sales can manage, workers can view
CREATE POLICY "Admin and sales can manage crews" ON public.crews FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'sales')
);

CREATE POLICY "Workers can view crews" ON public.crews FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'sales', 'worker')
);

-- Crew workers: Admin and sales can manage, workers can view their own crews
CREATE POLICY "Admin and sales can manage crew workers" ON public.crew_workers FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'sales')
);

CREATE POLICY "Workers can view their crew memberships" ON public.crew_workers FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.workers 
        WHERE workers.id = crew_workers.worker_id 
        AND workers.user_id = auth.uid()
    ) OR auth.jwt() ->> 'role' IN ('admin', 'sales')
);

-- Jobs: Admin and sales can manage all, workers can see jobs for their crews
CREATE POLICY "Admin and sales can manage jobs" ON public.jobs FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'sales')
);

CREATE POLICY "Workers can view jobs for their crews" ON public.jobs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.crew_workers 
        JOIN public.workers ON crew_workers.worker_id = workers.id
        WHERE crew_workers.crew_id = jobs.crew_id 
        AND workers.user_id = auth.uid()
    ) OR auth.jwt() ->> 'role' IN ('admin', 'sales')
);

-- Timeline items: Admin and sales can manage all, workers can manage their own
CREATE POLICY "Admin and sales can manage timeline items" ON public.timeline_items FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'sales')
);

CREATE POLICY "Workers can view and update their timeline items" ON public.timeline_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.workers 
        WHERE workers.id = timeline_items.worker_id 
        AND workers.user_id = auth.uid()
    ) OR auth.jwt() ->> 'role' IN ('admin', 'sales')
);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_workers; 