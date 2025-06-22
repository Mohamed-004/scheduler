-- Handle new user creation
-- This function will be triggered when a new user signs up via Supabase Auth
-- We'll keep it simple and let the setup flow handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Just log the new user creation, profile will be created in setup flow
  RAISE LOG 'New user created: %', NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error in handle_new_user(): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- This trigger will fire when a new user is created via Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user metadata when profile is updated
CREATE OR REPLACE FUNCTION public.update_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the auth.users metadata when user profile changes
  UPDATE auth.users 
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
                        jsonb_build_object(
                          'role', NEW.role,
                          'tz', NEW.tz
                        )
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the update
    RAISE LOG 'Error in update_auth_metadata(): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update auth metadata when user profile changes
DROP TRIGGER IF EXISTS on_user_profile_updated ON public.users;
CREATE TRIGGER on_user_profile_updated
  AFTER UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_auth_metadata();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.workers TO authenticated;
GRANT ALL ON public.crews TO authenticated;
GRANT ALL ON public.crew_workers TO authenticated;
GRANT ALL ON public.jobs TO authenticated;
GRANT ALL ON public.timeline_items TO authenticated; 