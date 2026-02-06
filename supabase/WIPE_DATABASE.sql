-- CMCB-XI Database: WIPE & RESET SCRIPT
-- ATENÇÃO: Este script apagará TODOS os dados do projeto.

-- 1. DROP TABLES (Ordem inversa para respeitar Foreign Keys)
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.accounts;
DROP TABLE IF EXISTS public.merchants;
DROP TABLE IF EXISTS public.entities;
DROP TABLE IF EXISTS public.user_roles;
DROP TABLE IF EXISTS public.profiles;

-- 2. DROP FUNCTIONS & TRIGGERS
DROP FUNCTION IF EXISTS public.process_transaction(jsonb);
DROP FUNCTION IF EXISTS public.void_transaction(uuid, text);
DROP FUNCTION IF EXISTS public.get_current_balances();
DROP FUNCTION IF EXISTS public.get_report_summary(date, date);
DROP FUNCTION IF EXISTS public.assign_demo_role(text);
DROP FUNCTION IF EXISTS public.is_active_user(uuid);
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.log_security_event() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. DROP ENUMS & TYPES
DROP TYPE IF EXISTS public.app_role;
DROP TYPE IF EXISTS public.fund_origin;
DROP TYPE IF EXISTS public.capital_custeio;
DROP TYPE IF EXISTS public.entity_type;
DROP TYPE IF EXISTS public.account_type;
DROP TYPE IF EXISTS public.merchant_mode;
DROP TYPE IF EXISTS public.transaction_module;
DROP TYPE IF EXISTS public.transaction_direction;
DROP TYPE IF EXISTS public.payment_method;
DROP TYPE IF EXISTS public.transaction_status;
DROP TYPE IF EXISTS public.shift_type;
DROP TYPE IF EXISTS public.audit_action;

-- OPCIONAL: Para um reset total do schema public (mais agressivo):
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;
