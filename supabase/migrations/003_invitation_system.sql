-- Create invitations table
CREATE TABLE public.invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    invited_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_invitations_invited_by ON public.invitations(invited_by);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
CREATE POLICY "Admin and sales can manage invitations" ON public.invitations FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'sales')
);

CREATE POLICY "Users can view their own invitations" ON public.invitations FOR SELECT USING (
    email = auth.jwt() ->> 'email'
);

-- Function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to handle invitation acceptance
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT, user_id UUID)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    result JSONB;
BEGIN
    -- Get the invitation
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Update or create user profile with correct role
    INSERT INTO public.users (id, email, role, tz)
    VALUES (user_id, invitation_record.email, invitation_record.role, 'America/Toronto')
    ON CONFLICT (id) DO UPDATE SET
        role = invitation_record.role,
        email = invitation_record.email,
        updated_at = NOW();
    
    -- Mark invitation as accepted
    UPDATE public.invitations 
    SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Create worker record if role is worker
    IF invitation_record.role = 'worker' THEN
        INSERT INTO public.workers (user_id, name, phone, tz)
        VALUES (user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'role', invitation_record.role,
        'name', invitation_record.name,
        'email', invitation_record.email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invitation
CREATE OR REPLACE FUNCTION create_invitation(
    p_email TEXT,
    p_role user_role,
    p_invited_by UUID,
    p_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    invitation_id UUID;
    invitation_token TEXT;
    result JSONB;
BEGIN
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
        RETURN jsonb_build_object('success', false, 'error', 'User with this email already exists');
    END IF;
    
    -- Check if there's already a pending invitation
    IF EXISTS (SELECT 1 FROM public.invitations WHERE email = p_email AND status = 'pending') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending invitation already exists for this email');
    END IF;
    
    -- Generate secure token
    invitation_token := generate_invitation_token();
    
    -- Create invitation
    INSERT INTO public.invitations (email, role, invited_by, token, name)
    VALUES (p_email, p_role, p_invited_by, invitation_token, p_name)
    RETURNING id INTO invitation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', invitation_id,
        'token', invitation_token,
        'email', p_email,
        'role', p_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger
CREATE TRIGGER update_invitations_updated_at 
    BEFORE UPDATE ON public.invitations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.invitations TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invitation_token() TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invitation(TEXT, user_role, UUID, TEXT) TO authenticated;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations; 