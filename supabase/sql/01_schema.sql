-- CMCB-XI Database: Initial Schema
-- Order: 01

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
        'mensalidade',
        'gasto_associacao',
        'assoc_transfer',
        'especie_transfer',
        'especie_deposito_pix',
        'especie_ajuste',
        'pix_ajuste',
        'cofre_ajuste',
        'conta_digital_transfer',
        'conta_digital_taxa',
        'conta_digital_ajuste',
        'aporte_saldo',
        'consumo_saldo',
        'pix_direto_uecx',
        'recurso_transfer',
        'aporte_estabelecimento_recurso',
        'taxa_pix_bb'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ... (existing types)

-- Transaction Items (Batches)
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    occurred_at TIMESTAMPTZ,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Items
CREATE INDEX IF NOT EXISTS idx_transaction_items_parent ON public.transaction_items(parent_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_created_at ON public.transaction_items(created_at);

-- RLS
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

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

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Entities (Associação, UE, CX)
CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  type public.entity_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Accounts
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

-- Merchants (Estabelecimentos)
CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode public.merchant_mode NOT NULL DEFAULT 'saldo',
  active BOOLEAN NOT NULL DEFAULT true,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transaction Modules Config
CREATE TABLE IF NOT EXISTS public.transaction_modules_config (
    module_key public.transaction_module PRIMARY KEY,
    label text NOT NULL,
    category text NOT NULL CHECK (category IN ('entry', 'expense', 'transfer', 'adjustment', 'neutral')),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Transactions
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

-- Audit Logs
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

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Ensure nullable columns for manual SQL execution (SQL Editor)
ALTER TABLE public.transactions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_entity ON transactions(entity_id);
CREATE INDEX IF NOT EXISTS idx_tx_source ON transactions(source_account_id);
CREATE INDEX IF NOT EXISTS idx_tx_dest ON transactions(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_tx_module ON transactions(module);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_audit_tx ON audit_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
