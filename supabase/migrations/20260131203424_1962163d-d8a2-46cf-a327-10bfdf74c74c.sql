-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create fund_origin enum
CREATE TYPE public.fund_origin AS ENUM ('UE', 'CX');

-- Create capital_custeio enum
CREATE TYPE public.capital_custeio AS ENUM ('capital', 'custeio');

-- Create entity_type enum
CREATE TYPE public.entity_type AS ENUM ('associacao', 'ue', 'cx');

-- Create account_type enum
CREATE TYPE public.account_type AS ENUM ('bank', 'cash', 'cash_reserve', 'virtual');

-- Create merchant_mode enum
CREATE TYPE public.merchant_mode AS ENUM ('saldo', 'fiado');

-- Create transaction_module enum
CREATE TYPE public.transaction_module AS ENUM (
  'mensalidade',
  'gasto_associacao',
  'bolsinha_transfer',
  'bolsinha_deposito_pix',
  'bolsinha_ajuste',
  'reserva_ajuste',
  'aporte_saldo',
  'consumo_saldo',
  'pix_direto_uecx',
  'fiado_registro',
  'fiado_pagamento'
);

-- Create transaction_direction enum
CREATE TYPE public.transaction_direction AS ENUM ('in', 'out', 'transfer');

-- Create payment_method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'pix');

-- Create transaction_status enum
CREATE TYPE public.transaction_status AS ENUM ('posted', 'voided');

-- Create shift enum
CREATE TYPE public.shift_type AS ENUM ('matutino', 'vespertino');

-- Create audit_action enum
CREATE TYPE public.audit_action AS ENUM ('edit', 'void');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Entities table
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  type public.entity_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  bank TEXT,
  agency TEXT,
  account_number TEXT,
  type public.account_type NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Merchants table
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode public.merchant_mode NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
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
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  action public.audit_action NOT NULL,
  before_json JSONB NOT NULL,
  after_json JSONB,
  reason TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is active
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

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for entities (all active users can read)
CREATE POLICY "Active users can view entities"
  ON public.entities FOR SELECT
  TO authenticated
  USING (public.is_active_user(auth.uid()));

-- RLS Policies for accounts (all active users can read)
CREATE POLICY "Active users can view accounts"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active users can update accounts"
  ON public.accounts FOR UPDATE
  TO authenticated
  USING (public.is_active_user(auth.uid()));

-- RLS Policies for merchants (all active users can CRUD)
CREATE POLICY "Active users can view merchants"
  ON public.merchants FOR SELECT
  TO authenticated
  USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active users can insert merchants"
  ON public.merchants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_user(auth.uid()));

CREATE POLICY "Active users can update merchants"
  ON public.merchants FOR UPDATE
  TO authenticated
  USING (public.is_active_user(auth.uid()));

-- RLS Policies for transactions (all active users can CRUD)
CREATE POLICY "Active users can view transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active users can insert transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_user(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Active users can update transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (public.is_active_user(auth.uid()));

-- RLS Policies for audit_logs (all active users can read, insert)
CREATE POLICY "Active users can view audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active users can insert audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_user(auth.uid()) AND user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED DATA: Insert entities
INSERT INTO public.entities (name, cnpj, type) VALUES
  ('Associação CMCB-XI', '37.812.756/0001-45', 'associacao'),
  ('Unidade Executora CMCB-XI', '38.331.489/0001-57', 'ue'),
  ('Caixa Escolar CMCB-XI', '37.812.693/0001-27', 'cx');

-- SEED DATA: Insert accounts for Associação
INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) 
SELECT id, 'BB Associação (PIX)', 'Banco do Brasil', '782-0', '36500-9', 'bank'
FROM public.entities WHERE type = 'associacao';

INSERT INTO public.accounts (entity_id, name, type) 
SELECT id, 'Bolsinha', 'cash'
FROM public.entities WHERE type = 'associacao';

INSERT INTO public.accounts (entity_id, name, type) 
SELECT id, 'Reserva', 'cash_reserve'
FROM public.entities WHERE type = 'associacao';

-- SEED DATA: Insert accounts for UE
INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) 
SELECT id, 'Educação Conectada UE', 'Banco do Brasil', '782-0', '37715-5', 'bank'
FROM public.entities WHERE type = 'ue';

INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) 
SELECT id, 'PDDE UE', 'Banco do Brasil', '782-0', '36699-4', 'bank'
FROM public.entities WHERE type = 'ue';

INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) 
SELECT id, 'PDDE Equidade UE', 'Banco do Brasil', '782-0', '46996-3', 'bank'
FROM public.entities WHERE type = 'ue';

-- SEED DATA: Insert accounts for CX
INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) 
SELECT id, 'Educação Conectada CX', 'Banco do Brasil', '782-0', '37714-7', 'bank'
FROM public.entities WHERE type = 'cx';

INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) 
SELECT id, 'PDDE CX', 'Banco do Brasil', '782-0', '36761-3', 'bank'
FROM public.entities WHERE type = 'cx';

INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) 
SELECT id, 'PDDE Equidade CX', 'Banco do Brasil', '782-0', '46995-5', 'bank'
FROM public.entities WHERE type = 'cx';

INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) 
SELECT id, 'PNAE Alimentação de Verdade', 'Banco do Brasil', '782-0', '47358-8', 'bank'
FROM public.entities WHERE type = 'cx';

INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) 
SELECT id, 'FEE CX', 'Banco do Brasil', '782-0', '36501-7', 'bank'
FROM public.entities WHERE type = 'cx';

INSERT INTO public.accounts (entity_id, name, type) 
SELECT id, 'PNAE Cartão', 'virtual'
FROM public.entities WHERE type = 'cx';

-- SEED DATA: Insert merchants
INSERT INTO public.merchants (name, mode) VALUES
  ('Bom Preço', 'saldo'),
  ('2 Irmãos', 'saldo'),
  ('Sacolão Brasil', 'saldo'),
  ('Fort.com', 'saldo'),
  ('Mercadinho Sampaio', 'fiado'),
  ('Fename', 'fiado');