-- ============================================================================
-- CMCB-XI DATABASE: FULL SYSTEM SETUP (CONSOLIDATED)
-- ============================================================================
-- Este script configura o banco de dados do zero, incluindo tipos, tabelas, 
-- segurança (RLS), funções de auditoria e lógica de negócio (RPCs).
-- Execute este script no SQL Editor do Supabase.

-- 1. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'demo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.fund_origin AS ENUM ('UE', 'CX');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.capital_custeio AS ENUM ('capital', 'custeio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.entity_type AS ENUM ('associacao', 'ue', 'cx');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.account_type AS ENUM ('bank', 'cash', 'cash_reserve', 'virtual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.merchant_mode AS ENUM ('saldo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_module AS ENUM (
        'mensalidade', 'gasto_associacao', 'assoc_transfer', 'especie_transfer',
        'especie_deposito_pix', 'especie_ajuste', 'pix_ajuste', 'cofre_ajuste',
        'conta_digital_transfer', 'conta_digital_taxa', 'conta_digital_ajuste',
        'aporte_saldo', 'consumo_saldo', 'pix_direto_uecx'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_direction AS ENUM ('in', 'out', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('cash', 'pix');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_status AS ENUM ('posted', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.shift_type AS ENUM ('matutino', 'vespertino');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.audit_action AS ENUM ('create', 'edit', 'void', 'change');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLES

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  type public.entity_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  bank TEXT,
  agency TEXT,
  account_number TEXT,
  type public.account_type NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT accounts_entity_id_name_key UNIQUE(entity_id, name)
);

CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode public.merchant_mode NOT NULL DEFAULT 'saldo',
  active BOOLEAN NOT NULL DEFAULT true,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  module public.transaction_module NOT NULL,
  entity_id UUID REFERENCES public.entities(id),
  source_account_id UUID REFERENCES public.accounts(id),
  destination_account_id UUID REFERENCES public.accounts(id),
  merchant_id UUID REFERENCES public.merchants(id),
  amount DECIMAL(15,2) NOT NULL,
  direction public.transaction_direction NOT NULL,
  payment_method public.payment_method,
  origin_fund public.fund_origin,
  capital_custeio public.capital_custeio,
  shift public.shift_type,
  description TEXT,
  notes TEXT,
  status public.transaction_status NOT NULL DEFAULT 'posted',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  action public.audit_action NOT NULL,
  before_json JSONB NOT NULL,
  after_json JSONB,
  reason TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Ensure nullable columns for manual SQL execution (SQL Editor)
ALTER TABLE public.transactions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- 3. SECURITY (Helpers, RLS, Triggers)

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS 'SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND active = true)';
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS 'SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ''admin'')';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: Admins/Own view" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin_user(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Profiles: Admins/Own update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()) OR auth.uid() = user_id) WITH CHECK (public.is_admin_user(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Admins only: manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins only: view audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Active users view data" ON public.accounts FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Active users view entities" ON public.entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Active users view transactions" ON public.transactions FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS 'BEGIN NEW.updated_at = now(); RETURN NEW; END;' LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_security_event() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS 'BEGIN IF TG_TABLE_NAME = ''profiles'' AND (OLD.active IS DISTINCT FROM NEW.active) THEN INSERT INTO public.audit_logs (action, before_json, after_json, reason, user_id) VALUES (''change'', jsonb_build_object(''active'', OLD.active), jsonb_build_object(''active'', NEW.active), ''Status alterado'', auth.uid()); ELSIF TG_TABLE_NAME = ''user_roles'' THEN INSERT INTO public.audit_logs (action, before_json, after_json, reason, user_id) VALUES (''change'', ''{}''::jsonb, jsonb_build_object(''role'', NEW.role, ''user'', NEW.user_id), ''Role updated'', auth.uid()); END IF; IF TG_OP = ''DELETE'' THEN RETURN OLD; END IF; RETURN NEW; END;';
CREATE TRIGGER trigger_log_profile_changes AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

-- 4. BUSINESS LOGIC (RPCs)

CREATE OR REPLACE FUNCTION public.process_transaction(p_tx jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_transaction_id uuid; v_amount numeric; v_direction text; v_txn public.transactions; BEGIN
  IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_amount := (p_tx->>'amount')::numeric; v_direction := p_tx->>'direction';
  INSERT INTO public.transactions (transaction_date, module, entity_id, source_account_id, destination_account_id, merchant_id, amount, direction, payment_method, origin_fund, capital_custeio, shift, description, notes, created_by)
  VALUES (COALESCE((p_tx->>'transaction_date')::date, CURRENT_DATE), (p_tx->>'module')::public.transaction_module, (p_tx->>'entity_id')::uuid, (p_tx->>'source_account_id')::uuid, (p_tx->>'destination_account_id')::uuid, (p_tx->>'merchant_id')::uuid, v_amount, v_direction::public.transaction_direction, p_tx->>'payment_method', p_tx->>'origin_fund', p_tx->>'capital_custeio', p_tx->>'shift', p_tx->>'description', p_tx->>'notes', auth.uid()) RETURNING * INTO v_txn;
  IF v_direction = 'in' THEN UPDATE public.accounts SET balance = balance + v_amount WHERE id = v_txn.destination_account_id;
  ELSIF v_direction = 'out' THEN UPDATE public.accounts SET balance = balance - v_amount WHERE id = v_txn.source_account_id;
  ELSIF v_direction = 'transfer' THEN UPDATE public.accounts SET balance = balance - v_amount WHERE id = v_txn.source_account_id; UPDATE public.accounts SET balance = balance + v_amount WHERE id = v_txn.destination_account_id; END IF;
  IF v_txn.merchant_id IS NOT NULL THEN
    IF v_txn.module = 'aporte_saldo' THEN UPDATE public.merchants SET balance = balance + v_amount WHERE id = v_txn.merchant_id;
    ELSIF v_txn.module = 'consumo_saldo' THEN UPDATE public.merchants SET balance = balance - v_amount WHERE id = v_txn.merchant_id; END IF;
  END IF;
  INSERT INTO public.audit_logs (transaction_id, action, before_json, after_json, reason, user_id) VALUES (v_txn.id, 'create', '{}'::jsonb, row_to_json(v_txn)::jsonb, 'Atomic Created', auth.uid());
  RETURN row_to_json(v_txn);
END; $$;

CREATE OR REPLACE FUNCTION public.void_transaction(p_id uuid, p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_txn public.transactions; BEGIN
  SELECT * INTO v_txn FROM public.transactions WHERE id = p_id FOR UPDATE;
  IF v_txn.status = 'voided' THEN RAISE EXCEPTION 'Already voided'; END IF;
  IF v_txn.direction = 'in' THEN UPDATE public.accounts SET balance = balance - v_txn.amount WHERE id = v_txn.destination_account_id;
  ELSIF v_txn.direction = 'out' THEN UPDATE public.accounts SET balance = balance + v_txn.amount WHERE id = v_txn.source_account_id;
  ELSIF v_txn.direction = 'transfer' THEN UPDATE public.accounts SET balance = balance + v_txn.amount WHERE id = v_txn.source_account_id; UPDATE public.accounts SET balance = balance - v_txn.amount WHERE id = v_txn.destination_account_id; END IF;
  IF v_txn.merchant_id IS NOT NULL THEN
    IF v_txn.module = 'aporte_saldo' THEN UPDATE public.merchants SET balance = balance - v_txn.amount WHERE id = v_txn.merchant_id;
    ELSIF v_txn.module = 'consumo_saldo' THEN UPDATE public.merchants SET balance = balance + v_txn.amount WHERE id = v_txn.merchant_id; END IF;
  END IF;
  UPDATE public.transactions SET status = 'voided', notes = COALESCE(notes, '') || ' | VOID: ' || p_reason WHERE id = p_id RETURNING * INTO v_txn;
  INSERT INTO public.audit_logs (transaction_id, action, before_json, after_json, reason, user_id) VALUES (p_id, 'void', row_to_json(v_txn)::jsonb, '{"status": "voided"}'::jsonb, p_reason, auth.uid());
  RETURN row_to_json(v_txn);
END; $$;

CREATE OR REPLACE FUNCTION public.get_current_balances() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb; v_assoc uuid; BEGIN
  SELECT id INTO v_assoc FROM entities WHERE type = 'associacao' LIMIT 1;
  RETURN jsonb_build_object(
    'especieBalance', COALESCE((SELECT balance FROM accounts WHERE entity_id = v_assoc AND name = 'Espécie'), 0),
    'pixBalance', COALESCE((SELECT balance FROM accounts WHERE entity_id = v_assoc AND name = 'PIX (Conta BB)'), 0),
    'contaDigitalBalance', COALESCE((SELECT balance FROM accounts WHERE entity_id = v_assoc AND name = 'Conta Digital (Escolaweb)'), 0),
    'cofreBalance', COALESCE((SELECT balance FROM accounts WHERE entity_id = v_assoc AND name = 'Cofre'), 0),
    'merchantBalances', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'balance', balance)), '[]'::jsonb) FROM merchants WHERE active = true),
    'resourceBalances', jsonb_build_object(
        'UE', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', a.balance)) , '[]'::jsonb) FROM accounts a JOIN entities e ON e.id = a.entity_id WHERE e.type = 'ue' AND a.active = true),
        'CX', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', a.balance)) , '[]'::jsonb) FROM accounts a JOIN entities e ON e.id = a.entity_id WHERE e.type = 'cx' AND a.active = true)
    )
  );
END; $$;

-- 5. SEED DATA

INSERT INTO public.entities (name, cnpj, type) VALUES ('Associação CMCB-XI', '37.812.756/0001-45', 'associacao'), ('Unidade Executora CMCB-XI', '38.331.489/0001-57', 'ue'), ('Caixa Escolar CMCB-XI', '37.812.693/0001-27', 'cx') ON CONFLICT DO NOTHING;

DO $$ DECLARE v_id uuid; BEGIN
  SELECT id INTO v_id FROM entities WHERE type = 'associacao';
  INSERT INTO public.accounts (entity_id, name, type) VALUES (v_id, 'Espécie', 'cash'), (v_id, 'PIX (Conta BB)', 'bank'), (v_id, 'Conta Digital (Escolaweb)', 'virtual'), (v_id, 'Cofre', 'cash_reserve') ON CONFLICT DO NOTHING;
END $$;

INSERT INTO public.merchants (name, mode) VALUES ('Bom Preço', 'saldo'), ('2 Irmãos', 'saldo'), ('Sacolão Brasil', 'saldo'), ('Fort.com', 'saldo'), ('Mercadinho Sampaio', 'saldo'), ('Fename', 'saldo') ON CONFLICT DO NOTHING;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
