-- CMCB-XI Database: Security & Auditing
-- Order: 02

-- 1. SECURITY HELPER FUNCTIONS

-- Check if user is active (profile.active = true)
CREATE OR REPLACE FUNCTION public.is_active_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND active = true
  )
$$;

-- Check if user is admin (user_roles.role = 'admin')
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

-- 2. RLS POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles: Admins view all, users view own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Profiles: Admins update all, users update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()) OR auth.uid() = user_id)
  WITH CHECK (public.is_admin_user(auth.uid()) OR auth.uid() = user_id);

-- Entities, Accounts, Merchants, Transactions
CREATE POLICY "Global: Selective Read for authenticated users"
  ON public.entities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Global: Active users can view business data"
  ON public.accounts FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

CREATE POLICY "Global: Active users can view merchants"
  ON public.merchants FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

CREATE POLICY "Global: Active users can view transactions"
  ON public.transactions FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

-- Transaction Items (Phase 2)
CREATE POLICY "Global: Active users can view transaction items"
  ON public.transaction_items FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

CREATE POLICY "Global: Active users can create transaction items"
  ON public.transaction_items FOR INSERT TO authenticated WITH CHECK (public.is_active_user(auth.uid()) AND auth.uid() = created_by);

-- User Roles & Audit Logs (Admin Only)
CREATE POLICY "Admins only: manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins only: view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- 3. AUDITING SYSTEM

-- Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Log security events (triggers)
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
      VALUES ('change', jsonb_build_object('active', OLD.active, 'email', OLD.email), jsonb_build_object('active', NEW.active, 'email', NEW.email), 'Status de ativação alterado', auth.uid());
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

-- 4. TRIGGERS

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_log_profile_changes AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_security_event();
CREATE TRIGGER trigger_log_role_changes AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_security_event();
