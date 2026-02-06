-- Add 'demo' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'demo';

-- Create index on user_roles for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Update is_active_user to strictly BLOCK demo users from most data
-- This function is used by RLS policies on accounts, transactions, merchants, etc.
CREATE OR REPLACE FUNCTION public.is_active_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.active = true
      AND NOT EXISTS (
        SELECT 1 
        FROM public.user_roles ur 
        WHERE ur.user_id = _user_id 
          AND ur.role = 'demo'
      )
  )
$$;

-- Function to easily assign demo role to a user by email
-- This helps setup the demo user without direct UUID manipulation
CREATE OR REPLACE FUNCTION public.assign_demo_role(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user by email in auth.users (requires permission, usually works in RLS policies for admin or specific functions)
  -- Note: Accessing auth.users directly might be restricted depending on context, 
  -- but as a SECURITY DEFINER function owned by postgres/superuser it should work for admin tasks.
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'User not found';
  END IF;

  -- Insert or Update role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'demo')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure profile is active so they can login (but is_active_user will still return false due to role check)
  UPDATE public.profiles SET active = true WHERE user_id = target_user_id;

  RETURN 'Demo role assigned to ' || target_email;
END;
$$;
