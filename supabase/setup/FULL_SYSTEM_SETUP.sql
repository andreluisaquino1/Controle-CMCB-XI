-- ============================================================================
-- CMCB-XI DATABASE: FULL SYSTEM SETUP (CONSOLIDATED 2026-02-08)
-- ============================================================================
-- Este script configura o banco de dados do zero, incluindo tipos, tabelas, 
-- segurança (RLS), funções de auditoria e lógica de negócio (RPCs).
-- Execute este script no SQL Editor do Supabase.

BEGIN;

-- 1. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'demo', 'secretaria');
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
    CREATE TYPE public.merchant_mode AS ENUM ('saldo', 'fiado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_module AS ENUM (
        'mensalidade', 'gasto_associacao', 'assoc_transfer', 'especie_transfer',
        'especie_deposito_pix', 'especie_ajuste', 'pix_ajuste', 'cofre_ajuste',
        'conta_digital_transfer', 'conta_digital_taxa', 'conta_digital_ajuste',
        'aporte_saldo', 'consumo_saldo', 'pix_direto_uecx', 'recurso_transfer', 
        'aporte_estabelecimento_recurso', 'mensalidade_pix', 'pix_nao_identificado', 'taxa_pix_bb'
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

-- (Tabela user_profiles removida por redundância, usando user_roles)

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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS public.transaction_modules_config (
    module_key public.transaction_module PRIMARY KEY,
    label text NOT NULL,
    category text NOT NULL CHECK (category IN ('entry', 'expense', 'transfer', 'adjustment', 'neutral')),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
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
  edited_reason TEXT,
  parent_transaction_id UUID REFERENCES public.transactions(id),
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    occurred_at TIMESTAMPTZ,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.1 SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL
);

COMMENT ON TABLE public.settings IS 'Configurações simples do sistema (key/value).';
COMMENT ON COLUMN public.settings.key IS 'Chave única da configuração.';
COMMENT ON COLUMN public.settings.value IS 'Valor textual da configuração.';

-- 2.2 IMMUTABLE LEDGER TABLES
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    type TEXT CHECK (type IN ('income', 'expense', 'transfer', 'fee', 'adjustment')),
    source_account TEXT NOT NULL,
    destination_account TEXT,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    description TEXT,
    reference_id UUID,
    status TEXT NOT NULL DEFAULT 'validated' CHECK (status IN ('pending', 'validated', 'voided')),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.ledger_audit_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    actor UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    before JSONB,
    after JSONB
);

-- 2.2 LEDGER VIEWS
DROP VIEW IF EXISTS public.ledger_balances CASCADE;
CREATE VIEW public.ledger_balances AS
 SELECT account_id,
    sum(delta_cents) AS balance_cents
   FROM ( 
     SELECT source_account AS account_id, (- amount_cents) AS delta_cents
     FROM public.ledger_transactions WHERE status = 'validated'
     UNION ALL
     SELECT destination_account AS account_id, amount_cents AS delta_cents
     FROM public.ledger_transactions WHERE destination_account IS NOT NULL AND status = 'validated'
   ) t
  GROUP BY account_id;

-- 3. SECURITY (Helpers, RLS, Triggers)

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS 'SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND active = true)';
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS 'SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ''admin'')';

CREATE OR REPLACE FUNCTION public.check_can_moderate_ledger() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'user')
  );
END; $$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
END; $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles: Admins/Own view" ON public.profiles;
CREATE POLICY "Profiles: Admins/Own view" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin_user(auth.uid()) OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Profiles: Admins/Own update" ON public.profiles;
CREATE POLICY "Profiles: Admins/Own update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()) OR auth.uid() = user_id) WITH CHECK (public.is_admin_user(auth.uid()) OR auth.uid() = user_id);

-- User Roles Policies
DROP POLICY IF EXISTS "User Roles: Admins only" ON public.user_roles;
CREATE POLICY "User Roles: Admins only" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin_user(auth.uid()));

-- Accounts Policies
DROP POLICY IF EXISTS "Accounts: Active users view" ON public.accounts;
CREATE POLICY "Accounts: Active users view" ON public.accounts FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
DROP POLICY IF EXISTS "Accounts: Active users update" ON public.accounts;
CREATE POLICY "Accounts: Active users update" ON public.accounts FOR UPDATE TO authenticated USING (public.is_active_user(auth.uid())) WITH CHECK (public.is_active_user(auth.uid()));
DROP POLICY IF EXISTS "Accounts: Active users insert" ON public.accounts;
CREATE POLICY "Accounts: Active users insert" ON public.accounts FOR INSERT TO authenticated WITH CHECK (public.is_active_user(auth.uid()));

-- Merchants Policies
DROP POLICY IF EXISTS "Merchants: Active users view" ON public.merchants;
CREATE POLICY "Merchants: Active users view" ON public.merchants FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

-- Transactions Policies
DROP POLICY IF EXISTS "Transactions: Active users view" ON public.transactions;
CREATE POLICY "Transactions: Active users view" ON public.transactions FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

-- Settings Policies
DROP POLICY IF EXISTS "Settings: Read for all authenticated" ON public.settings;
CREATE POLICY "Settings: Read for all authenticated" ON public.settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Settings: Write only admin" ON public.settings;
CREATE POLICY "Settings: Write only admin" ON public.settings FOR ALL TO authenticated USING (public.check_can_moderate_ledger());

-- Ledger Immutability
CREATE OR REPLACE FUNCTION public.block_ledger_mutations() RETURNS trigger LANGUAGE plpgsql AS $$
begin
  if current_setting('app.allow_ledger_reset', true) = 'on' then return new; end if;
  raise exception 'ledger_transactions is immutable (no UPDATE/DELETE allowed)';
end; $$;

DROP TRIGGER IF EXISTS block_ledger_update ON public.ledger_transactions;
CREATE TRIGGER block_ledger_update BEFORE UPDATE ON public.ledger_transactions FOR EACH ROW EXECUTE FUNCTION public.block_ledger_mutations();
DROP TRIGGER IF EXISTS block_ledger_delete ON public.ledger_transactions;
CREATE TRIGGER block_ledger_delete BEFORE DELETE ON public.ledger_transactions FOR EACH ROW EXECUTE FUNCTION public.block_ledger_mutations();

-- Ledger Audit
CREATE OR REPLACE FUNCTION public.audit_ledger_insert() RETURNS trigger LANGUAGE plpgsql AS $$
begin
  insert into public.ledger_audit_log(actor, action, entity, entity_id, before, after)
  values (auth.uid(), 'INSERT_LEDGER', 'ledger_transactions', new.id::text, null, to_jsonb(new));
  return new;
end; $$;

DROP TRIGGER IF EXISTS audit_ledger_insert_tr ON public.ledger_transactions;
CREATE TRIGGER audit_ledger_insert_tr AFTER INSERT ON public.ledger_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_ledger_insert();

-- Settings Updated At
CREATE TRIGGER trg_settings_touch BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

-- 4. BUSINESS LOGIC (RPCs)

CREATE OR REPLACE FUNCTION public.get_primary_account(p_entity uuid, p_type account_type) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id FROM public.accounts WHERE entity_id = p_entity AND type = p_type AND active = true ORDER BY created_at LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.process_transaction(p_tx jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_amount numeric; v_direction text; v_src uuid; v_dst uuid; v_txn public.transactions; v_user_id uuid; BEGIN
  v_user_id := auth.uid();
  IF NOT public.is_active_user(v_user_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_amount := (p_tx->>'amount')::numeric; v_direction := p_tx->>'direction';
  v_src := (p_tx->>'source_account_id')::uuid; v_dst := (p_tx->>'destination_account_id')::uuid;
  
  INSERT INTO public.transactions (transaction_date, module, entity_id, source_account_id, destination_account_id, merchant_id, amount, direction, payment_method, origin_fund, capital_custeio, shift, description, notes, created_by, status, parent_transaction_id)
  VALUES (COALESCE((p_tx->>'transaction_date')::date, CURRENT_DATE), (p_tx->>'module')::public.transaction_module, (p_tx->>'entity_id')::uuid, v_src, v_dst, (p_tx->>'merchant_id')::uuid, v_amount, v_direction::public.transaction_direction, (p_tx->>'payment_method')::public.payment_method, (p_tx->>'origin_fund')::public.fund_origin, (p_tx->>'capital_custeio')::public.capital_custeio, (p_tx->>'shift')::public.shift_type, p_tx->>'description', p_tx->>'notes', v_user_id, 'posted', (p_tx->>'parent_transaction_id')::uuid) RETURNING * INTO v_txn;
  
  IF v_direction = 'in' THEN UPDATE public.accounts SET balance = balance + v_amount WHERE id = v_txn.destination_account_id;
  ELSIF v_direction = 'out' THEN UPDATE public.accounts SET balance = balance - v_amount WHERE id = v_txn.source_account_id;
  ELSIF v_direction = 'transfer' THEN UPDATE public.accounts SET balance = balance - v_amount WHERE id = v_txn.source_account_id; UPDATE public.accounts SET balance = balance + v_amount WHERE id = v_txn.destination_account_id; END IF;
  
  IF v_txn.merchant_id IS NOT NULL THEN
    IF v_txn.module = 'aporte_saldo' THEN UPDATE public.merchants SET balance = balance + v_amount WHERE id = v_txn.merchant_id;
    ELSIF v_txn.module = 'consumo_saldo' THEN UPDATE public.merchants SET balance = balance - v_amount WHERE id = v_txn.merchant_id; END IF;
  END IF;
  
  INSERT INTO public.audit_logs (transaction_id, action, before_json, after_json, reason, user_id) 
  VALUES (v_txn.id, 'create', '{}'::jsonb, row_to_json(v_txn)::jsonb, 'Criação de transação', v_user_id);
  
  RETURN row_to_json(v_txn);
END; $$;

CREATE OR REPLACE FUNCTION public.process_resource_transaction(p_tx jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_acc uuid; v_type text; BEGIN
  IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_acc := (p_tx->>'source_account_id')::uuid;
  IF v_acc IS NULL THEN RAISE EXCEPTION 'Source account ID is required for resource transactions'; END IF;
  SELECT e.type INTO v_type FROM public.accounts a JOIN public.entities e ON e.id = a.entity_id WHERE a.id = v_acc;
  IF v_type NOT IN ('ue', 'cx') THEN RAISE EXCEPTION 'Access Denied: Resource entities (UE/CX) only'; END IF;
  RETURN public.process_transaction(p_tx);
END; $$;

CREATE OR REPLACE FUNCTION public.void_transaction(p_id uuid, p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_before jsonb; v_txn record; v_user_id uuid; BEGIN
    v_user_id := auth.uid();
    IF NOT public.is_active_user(v_user_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT row_to_json(t)::jsonb INTO v_before FROM public.transactions t WHERE id = p_id FOR UPDATE;
    IF v_before IS NULL THEN RAISE EXCEPTION 'Transaction not found'; END IF;
    IF (v_before->>'status') = 'voided' THEN RAISE EXCEPTION 'Already voided'; END IF;
    
    IF (v_before->>'direction') = 'in' THEN UPDATE public.accounts SET balance = balance - (v_before->>'amount')::numeric WHERE id = (v_before->>'destination_account_id')::uuid;
    ELSIF (v_before->>'direction') = 'out' THEN UPDATE public.accounts SET balance = balance + (v_before->>'amount')::numeric WHERE id = (v_before->>'source_account_id')::uuid;
    ELSIF (v_before->>'direction') = 'transfer' THEN
      UPDATE public.accounts SET balance = balance + (v_before->>'amount')::numeric WHERE id = (v_before->>'source_account_id')::uuid;
      UPDATE public.accounts SET balance = balance - (v_before->>'amount')::numeric WHERE id = (v_before->>'destination_account_id')::uuid;
    END IF;
    
    IF (v_before->>'merchant_id') IS NOT NULL THEN
      IF (v_before->>'module') = 'aporte_saldo' THEN UPDATE public.merchants SET balance = balance - (v_before->>'amount')::numeric WHERE id = (v_before->>'merchant_id')::uuid;
      ELSIF (v_before->>'module') = 'consumo_saldo' THEN UPDATE public.merchants SET balance = balance + (v_before->>'amount')::numeric WHERE id = (v_before->>'merchant_id')::uuid;
      END IF;
    END IF;
    
    UPDATE public.transactions SET status = 'voided', notes = COALESCE(notes, '') || ' | VOID: ' || p_reason WHERE id = p_id RETURNING * INTO v_txn;
    INSERT INTO public.audit_logs (transaction_id, action, before_json, after_json, reason, user_id) 
    VALUES (p_id, 'void', v_before, row_to_json(v_txn)::jsonb, p_reason, v_user_id);
    RETURN row_to_json(v_txn);
END; $$;

CREATE OR REPLACE FUNCTION public.get_ledger_balance_map()
RETURNS TABLE (account_id text, balance_cents bigint)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' 
AS $$ SELECT account_id, balance_cents FROM ledger_balances; $$;

CREATE OR REPLACE FUNCTION public.approve_ledger_transaction(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.check_can_moderate_ledger() THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores ou usuários autorizados podem validar transações.';
    END IF;

    UPDATE public.ledger_transactions 
    SET status = 'validated'
    WHERE id = p_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_balances() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_assoc uuid; BEGIN
  SELECT id INTO v_assoc FROM entities WHERE type = 'associacao' LIMIT 1;
  RETURN jsonb_build_object(
    'especieBalance', COALESCE((SELECT balance_cents::numeric/100 FROM ledger_balances WHERE account_id = 'cash'), 0),
    'pixBalance', COALESCE((SELECT balance_cents::numeric/100 FROM ledger_balances WHERE account_id = 'pix_bb'), 0),
    'contaDigitalBalance', COALESCE((SELECT balance_cents::numeric/100 FROM ledger_balances WHERE account_id = 'digital_escolaweb'), 0),
    'cofreBalance', COALESCE((SELECT balance_cents::numeric/100 FROM ledger_balances WHERE account_id = 'safe'), 0),
    'merchantBalances', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'balance', COALESCE(lb.balance_cents::numeric/100, 0))), '[]'::jsonb) 
                         FROM merchants m 
                         LEFT JOIN ledger_balances lb ON lb.account_id = m.id::text 
                         WHERE active = true),
    'resourceBalances', jsonb_build_object(
        'UE', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', COALESCE(lb.balance_cents::numeric/100, 0))) , '[]'::jsonb) 
               FROM accounts a 
               JOIN entities e ON e.id = a.entity_id 
               LEFT JOIN ledger_balances lb ON lb.account_id = a.id::text
               WHERE e.type = 'ue' AND a.active = true),
        'CX', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', COALESCE(lb.balance_cents::numeric/100, 0))) , '[]'::jsonb) 
               FROM accounts a 
               JOIN entities e ON e.id = a.entity_id 
               LEFT JOIN ledger_balances lb ON lb.account_id = a.id::text
               WHERE e.type = 'cx' AND a.active = true)
    )
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(start_date date, end_date date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE result jsonb; weekly_expenses_cash numeric := 0; weekly_expenses_pix numeric := 0; weekly_entries_cash numeric := 0; weekly_entries_pix numeric := 0; weekly_deposits numeric := 0; weekly_consumption numeric := 0; weekly_direct_pix numeric := 0; BEGIN
  SELECT COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'cash' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'pix' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN module = 'mensalidade' AND payment_method = 'cash' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN (module = 'mensalidade' AND payment_method = 'pix') OR module = 'mensalidade_pix' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN module = 'aporte_saldo' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN module = 'consumo_saldo' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN module = 'pix_direto_uecx' THEN amount ELSE 0 END), 0)
  INTO weekly_expenses_cash, weekly_expenses_pix, weekly_entries_cash, weekly_entries_pix, weekly_deposits, weekly_consumption, weekly_direct_pix FROM transactions WHERE transaction_date >= start_date AND transaction_date <= end_date AND status = 'posted';
  RETURN jsonb_build_object('weeklyExpensesCash', weekly_expenses_cash, 'weeklyExpensesPix', weekly_expenses_pix, 'weeklyEntriesCash', weekly_entries_cash, 'weeklyEntriesPix', weekly_entries_pix, 'weeklyDeposits', weekly_deposits, 'weeklyConsumption', weekly_consumption, 'weeklyDirectPix', weekly_direct_pix);
END; $$;

CREATE OR REPLACE FUNCTION public.get_report_summary(p_start_date date, p_end_date date, p_entity_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cd_id uuid; v_pix_id uuid; v_summary record; BEGIN
  IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id INTO v_cd_id FROM accounts WHERE entity_id = p_entity_id AND name = 'Conta Digital (Escolaweb)' LIMIT 1;
  SELECT id INTO v_pix_id FROM accounts WHERE entity_id = p_entity_id AND name = 'PIX (Conta BB)' LIMIT 1;
  SELECT COALESCE(SUM(CASE WHEN t.module = 'gasto_associacao' AND t.payment_method = 'cash' THEN t.amount ELSE 0 END), 0) as expenses_cash, COALESCE(SUM(CASE WHEN t.module = 'gasto_associacao' AND t.payment_method = 'pix' THEN t.amount ELSE 0 END), 0) as expenses_pix, COALESCE(SUM(CASE WHEN (c.category = 'transfer' OR t.module = 'conta_digital_taxa') AND t.source_account_id = v_cd_id THEN t.amount ELSE 0 END), 0) as expenses_digital, COALESCE(SUM(CASE WHEN t.module = 'taxa_pix_bb' THEN t.amount ELSE 0 END), 0) as pix_fees, COALESCE(SUM(CASE WHEN t.module = 'mensalidade' AND t.payment_method = 'cash' THEN t.amount ELSE 0 END), 0) as entries_cash, COALESCE(SUM(CASE WHEN (t.module = 'mensalidade' AND t.payment_method = 'pix') OR t.module = 'mensalidade_pix' THEN t.amount ELSE 0 END), 0) as entries_pix, COALESCE(SUM(CASE WHEN t.module = 'pix_nao_identificado' THEN t.amount ELSE 0 END), 0) as entries_pix_nao_identificado, COALESCE(SUM(CASE WHEN t.module = 'aporte_saldo' THEN t.amount ELSE 0 END), 0) as deposits, COALESCE(SUM(CASE WHEN t.module = 'consumo_saldo' THEN t.amount ELSE 0 END), 0) as consumption, COALESCE(SUM(CASE WHEN t.module = 'pix_direto_uecx' THEN t.amount ELSE 0 END), 0) as direct_pix
  INTO v_summary FROM transactions t JOIN transaction_modules_config c ON c.module_key = t.module WHERE transaction_date >= p_start_date AND transaction_date <= p_end_date AND status = 'posted' AND t.entity_id = p_entity_id;
  RETURN jsonb_build_object('weeklyExpensesCash', v_summary.expenses_cash, 'weeklyExpensesPix', v_summary.expenses_pix, 'weeklyExpensesDigital', v_summary.expenses_digital, 'weeklyPixFees', v_summary.pix_fees, 'weeklyEntriesCash', v_summary.entries_cash, 'weeklyEntriesPix', v_summary.entries_pix, 'weeklyEntriesPixNaoIdentificado', v_summary.entries_pix_nao_identificado, 'weeklyDeposits', v_summary.deposits, 'weeklyConsumption', v_summary.consumption, 'weeklyDirectPix', v_summary.direct_pix);
END; $$;

CREATE OR REPLACE FUNCTION public.process_pix_fee_batch(p_entity_id uuid, p_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id uuid; v_source_account_id uuid; v_total numeric := 0; v_item jsonb; v_txn_id uuid; v_txn public.transactions; v_items_count int := 0; v_occurred_at timestamptz; BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT public.is_active_user(v_user_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id INTO v_source_account_id FROM public.accounts WHERE entity_id = p_entity_id AND name = 'PIX (Conta BB)' AND active = true;
  IF v_source_account_id IS NULL THEN RAISE EXCEPTION 'Conta PIX BB não encontrada.'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP v_total := v_total + (v_item->>'amount')::numeric; v_items_count := v_items_count + 1; END LOOP;
  v_occurred_at := COALESCE((p_payload->>'occurred_at')::timestamptz, now());
  INSERT INTO public.transactions (transaction_date, module, entity_id, source_account_id, amount, direction, payment_method, description, notes, created_by, status)
  VALUES (v_occurred_at::date, 'taxa_pix_bb', p_entity_id, v_source_account_id, v_total, 'out', 'cash', 'Taxas PIX (Lote)', 'Referência: ' || COALESCE(p_payload->>'reference', 'N/A') || ' | Itens: ' || v_items_count, v_user_id, 'posted') RETURNING * INTO v_txn;
  v_txn_id := v_txn.id;
  UPDATE public.accounts SET balance = balance - v_total WHERE id = v_source_account_id;
  INSERT INTO public.transaction_items (parent_transaction_id, amount, occurred_at, description, created_by)
  SELECT v_txn_id, (item->>'amount')::numeric, COALESCE((item->>'occurred_at')::timestamptz, v_occurred_at), item->>'description', v_user_id FROM jsonb_array_elements(p_payload->'items') AS item;
  RETURN v_txn_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_transaction_items(p_parent_transaction_id uuid) RETURNS SETOF transaction_items LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT * FROM public.transaction_items WHERE parent_transaction_id = p_parent_transaction_id AND public.is_active_user(auth.uid()) ORDER BY occurred_at DESC NULLS LAST, created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, active)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email, false);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Nuclear Reset Function
CREATE OR REPLACE FUNCTION public.reset_all_data()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário pode moderar o ledger (admin/usuário)
  IF NOT public.check_can_moderate_ledger() THEN
    RAISE EXCEPTION 'Acesso negado: Somente administradores ou usuários autorizados podem resetar os dados.';
  END IF;

  -- Bypass Immutability Trigger
  PERFORM set_config('app.allow_ledger_reset', 'on', true);

  -- Limpeza rápida com TRUNCATE CASCADE
  TRUNCATE TABLE 
    public.ledger_audit_log,
    public.audit_logs,
    public.transaction_items,
    public.ledger_transactions,
    public.transactions
  RESTART IDENTITY CASCADE;

  -- Zerar saldos legados (redundância para segurança)
  UPDATE public.accounts SET balance = 0 WHERE true;
  UPDATE public.merchants SET balance = 0 WHERE true;
  
  -- Resetar bypass
  PERFORM set_config('app.allow_ledger_reset', 'off', true);
END;
$$;

-- 5. SEED DATA

INSERT INTO public.entities (name, cnpj, type) VALUES ('Associação CMCB-XI', '37.812.756/0001-45', 'associacao'), ('Unidade Executora CMCB-XI', '38.331.489/0001-57', 'ue'), ('Caixa Escolar CMCB-XI', '37.812.693/0001-27', 'cx') ON CONFLICT (cnpj) DO NOTHING;

DO $$ DECLARE v_id uuid; BEGIN
  SELECT id INTO v_id FROM entities WHERE type = 'associacao';
  INSERT INTO public.accounts (entity_id, name, type) VALUES (v_id, 'Espécie', 'cash'), (v_id, 'PIX (Conta BB)', 'bank'), (v_id, 'Conta Digital (Escolaweb)', 'virtual'), (v_id, 'Cofre', 'cash_reserve') ON CONFLICT (entity_id, name) DO NOTHING;
END $$;

INSERT INTO public.transaction_modules_config (module_key, label, category)
VALUES 
    ('mensalidade', 'Mensalidade (Dinheiro)', 'entry'), 
    ('mensalidade_pix', 'Mensalidade (PIX)', 'entry'),
    ('pix_nao_identificado', 'PIX Não Identificado', 'entry'),
    ('gasto_associacao', 'Despesa Associação', 'expense'), 
    ('assoc_transfer', 'Movimentação Associação', 'transfer'), 
    ('especie_transfer', 'Movimentação entre Contas', 'transfer'), 
    ('especie_deposito_pix', 'Depósito PIX', 'transfer'), 
    ('especie_ajuste', 'Ajuste de Saldo (Espécie)', 'adjustment'), 
    ('pix_ajuste', 'Ajuste de Saldo (PIX)', 'adjustment'), 
    ('cofre_ajuste', 'Ajuste de Saldo (Cofre)', 'adjustment'), 
    ('conta_digital_ajuste', 'Ajuste Conta Digital', 'adjustment'), 
    ('conta_digital_taxa', 'Taxa Escolaweb', 'expense'), 
    ('consumo_saldo', 'Gasto Estabelecimento', 'expense'), 
    ('pix_direto_uecx', 'Gasto de Recurso', 'expense'), 
    ('aporte_saldo', 'Depósito em Estabelecimento', 'transfer'), 
    ('aporte_estabelecimento_recurso', 'Aporte em Estabelecimento (Recurso)', 'transfer'), 
    ('taxa_pix_bb', 'Taxas PIX BB (Lote)', 'expense')
ON CONFLICT (module_key) DO UPDATE SET label = EXCLUDED.label, category = EXCLUDED.category;

-- Settings Seed
INSERT INTO public.settings (key, value)
VALUES ('support_contact_text', 'Entre em contato com a administração solicitando a ativação para acessar o sistema.')
ON CONFLICT (key) DO NOTHING;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;
