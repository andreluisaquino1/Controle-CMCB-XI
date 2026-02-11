-- Migration: Módulo Formaturas
-- Data: 2026-02-10

BEGIN;

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE public.graduation_installment_status AS ENUM ('EM_ABERTO', 'PAGO', 'ISENTO', 'CANCELADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.graduation_extra_type AS ENUM ('RIFA', 'BINGO', 'ALIMENTOS', 'EVENTO', 'DOACAO', 'OUTROS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLES

CREATE TABLE IF NOT EXISTS public.graduations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    year INTEGER NOT NULL DEFAULT 2026,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.graduation_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graduation_id UUID NOT NULL REFERENCES public.graduations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.graduation_class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.graduation_classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.graduation_carnet_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graduation_id UUID NOT NULL REFERENCES public.graduations(id) ON DELETE CASCADE,
    installment_value DECIMAL(15,2) NOT NULL,
    installments_count INTEGER NOT NULL,
    due_day INTEGER NOT NULL DEFAULT 10,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(graduation_id, version)
);

CREATE TABLE IF NOT EXISTS public.graduation_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.graduation_class_students(id) ON DELETE CASCADE,
    carnet_config_id UUID NOT NULL REFERENCES public.graduation_carnet_configs(id),
    installment_number INTEGER NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    status public.graduation_installment_status NOT NULL DEFAULT 'EM_ABERTO',
    paid_at TIMESTAMP WITH TIME ZONE,
    pay_method public.payment_method,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, installment_number)
);

CREATE TABLE IF NOT EXISTS public.graduation_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graduation_id UUID NOT NULL REFERENCES public.graduations(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    value DECIMAL(15,2) NOT NULL CHECK (value > 0),
    pay_method public.payment_method NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.graduation_extra_incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graduation_id UUID NOT NULL REFERENCES public.graduations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.graduation_classes(id) ON DELETE SET NULL,
    type public.graduation_extra_type NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    gross_value DECIMAL(15,2) NOT NULL CHECK (gross_value >= 0),
    costs DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (costs >= 0),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.graduation_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graduation_id UUID NOT NULL REFERENCES public.graduations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.graduation_classes(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    value DECIMAL(15,2) NOT NULL CHECK (value > 0),
    pay_method public.payment_method NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. RLS POLICIES

ALTER TABLE public.graduations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graduation_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graduation_class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graduation_carnet_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graduation_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graduation_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graduation_extra_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graduation_expenses ENABLE ROW LEVEL SECURITY;

-- Select for all active users
CREATE POLICY "Graduations select: active users" ON public.graduations FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Graduation Classes select: active users" ON public.graduation_classes FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Graduation Students select: active users" ON public.graduation_class_students FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Carnet Configs select: active users" ON public.graduation_carnet_configs FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Installments select: active users" ON public.graduation_installments FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Transfers select: active users" ON public.graduation_transfers FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Extra Incomes select: active users" ON public.graduation_extra_incomes FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Expenses select: active users" ON public.graduation_expenses FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

-- Insert/Update/Delete only for admin or active users where appropriate
-- For this simplified module, active users can do most things, but only admins can change configurations.

CREATE POLICY "Carnet Configs: Admins only" ON public.graduation_carnet_configs FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Graduations: Admins only" ON public.graduations FOR ALL TO authenticated USING (public.is_admin());

-- For other tables, allow active users to manage data
CREATE POLICY "Graduation Classes: Active users manage" ON public.graduation_classes FOR ALL TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Graduation Students: Active users manage" ON public.graduation_class_students FOR ALL TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Installments: Active users manage" ON public.graduation_installments FOR ALL TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Transfers: Active users manage" ON public.graduation_transfers FOR ALL TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Extra Incomes: Active users manage" ON public.graduation_extra_incomes FOR ALL TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Expenses: Active users manage" ON public.graduation_expenses FOR ALL TO authenticated USING (public.is_active_user(auth.uid()));

-- 4. SEED DATA

-- Formaturas
INSERT INTO public.graduations (id, name, year) VALUES 
('99999999-9999-4999-8999-999999999009', 'Formatura 9º Ano', 2026),
('99999999-9999-4999-8999-999999999003', 'Formatura 3º Ano', 2026)
ON CONFLICT (id) DO NOTHING;

-- Turmas
INSERT INTO public.graduation_classes (id, graduation_id, name) VALUES 
(gen_random_uuid(), '99999999-9999-4999-8999-999999999009', '9 Ano "A"'),
(gen_random_uuid(), '99999999-9999-4999-8999-999999999009', '9 Ano "B"'),
(gen_random_uuid(), '99999999-9999-4999-8999-999999999003', '3 Ano CNS'),
(gen_random_uuid(), '99999999-9999-4999-8999-999999999003', '3 Ano CHL')
ON CONFLICT DO NOTHING;

-- Configurações Iniciais do Carnê (Versão 1)
INSERT INTO public.graduation_carnet_configs (graduation_id, installment_value, installments_count, due_day, version) VALUES 
('99999999-9999-4999-8999-999999999009', 50.00, 6, 10, 1),
('99999999-9999-4999-8999-999999999003', 60.00, 10, 10, 1)
ON CONFLICT DO NOTHING;

COMMIT;
