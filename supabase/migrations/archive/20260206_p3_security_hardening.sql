-- Migration: 20260206_p3_security_hardening.sql
-- Goal: Restricted RLS for profiles, user_roles, audit_logs and security auditing

-- 1. Helper Function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- 2. Profiles RLS Hardening
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Admins view all, users view own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Admins update all, users update own (restricted)"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()) OR auth.uid() = user_id)
  WITH CHECK (
    -- Non-admins cannot change 'active' status
    (public.is_admin_user(auth.uid())) OR 
    (auth.uid() = user_id AND active = (SELECT active FROM public.profiles WHERE id = NEW.id))
  );

-- 3. User Roles RLS Hardening
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Admins view all, users view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 4. Audit Logs RLS Hardening
DROP POLICY IF EXISTS "Active users can view audit_logs" ON public.audit_logs;
CREATE POLICY "Only admins can view audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- Keep insert policy for active users (for voiding/adjusting)
-- DROP POLICY IF EXISTS "Active users can insert audit_logs" ON public.audit_logs;

-- 5. Auditing User/Role Changes
-- First, ensure audit_action has 'change'
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'change';

-- Function to log profile changes (activation/deactivation)
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.active IS DISTINCT FROM NEW.active) THEN
    -- Generic audit log insert (note: transaction_id is required currently in the schema)
    -- Since these aren't financial transactions, we might need to handle NULL or a placeholder
    -- But according to the schema: transaction_id REFERENCES transactions(id) NOT NULL
    -- This is a limitation. I'll need to allow NULL transaction_id first.
    NULL; -- See below for ALTER TABLE
  END IF;
  RETURN NEW;
END;
$$;

-- Modify audit_logs to allow NULL transaction_id for system/user events
ALTER TABLE public.audit_logs ALTER COLUMN transaction_id DROP NOT NULL;

-- Improved logging function
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profile Activation/Deactivation
  IF TG_TABLE_NAME = 'profiles' THEN
    IF (OLD.active IS DISTINCT FROM NEW.active) THEN
      INSERT INTO public.audit_logs (action, before_json, after_json, reason, user_id)
      VALUES (
        'change',
        jsonb_build_object('active', OLD.active, 'user_email', OLD.email),
        jsonb_build_object('active', NEW.active, 'user_email', NEW.email),
        'Alteração de status de ativação do usuário',
        auth.uid()
      );
    END IF;
  
  -- Role Changes
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.audit_logs (action, before_json, after_json, reason, user_id)
      VALUES ('change', '{}'::jsonb, jsonb_build_object('role', NEW.role, 'subject_id', NEW.user_id), 'Novo cargo atribuído', auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO public.audit_logs (action, before_json, after_json, reason, user_id)
      VALUES ('change', jsonb_build_object('role', OLD.role), jsonb_build_object('role', NEW.role), 'Cargo alterado', auth.uid());
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.audit_logs (action, before_json, after_json, reason, user_id)
      VALUES ('change', jsonb_build_object('role', OLD.role, 'subject_id', OLD.user_id), '{}'::jsonb, 'Cargo removido', auth.uid());
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Apply Triggers
DROP TRIGGER IF EXISTS trigger_log_profile_changes ON public.profiles;
CREATE TRIGGER trigger_log_profile_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

DROP TRIGGER IF EXISTS trigger_log_role_changes ON public.user_roles;
CREATE TRIGGER trigger_log_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();
