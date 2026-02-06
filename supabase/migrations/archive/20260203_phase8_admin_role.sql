-- Migration: Phase 8 - Fix admin role-based authorization
-- Seed admin role for the current user only

-- This migration ensures the admin user has the proper role in user_roles table
-- Note: Replace the email below with the actual admin user email from auth.users

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find user ID by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'andreluis_57@hotmail.com'
  LIMIT 1;

  -- If user exists, ensure they have admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User with email andreluis_57@hotmail.com not found. Admin role will be granted on first login.';
  END IF;
END $$;

-- Add RLS policy to restrict profiles table access for admin operations
-- Only admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
    OR auth.uid() = user_id
  );

-- Drop the old "Users can view own profile" policy if it conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
