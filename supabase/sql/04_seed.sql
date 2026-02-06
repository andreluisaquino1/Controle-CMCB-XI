-- CMCB-XI Database: Seed Data
-- Order: 04

-- 1. ENTITIES
INSERT INTO public.entities (name, cnpj, type) VALUES
  ('Associação CMCB-XI', '37.812.756/0001-45', 'associacao'),
  ('Unidade Executora CMCB-XI', '38.331.489/0001-57', 'ue'),
  ('Caixa Escolar CMCB-XI', '37.812.693/0001-27', 'cx')
ON CONFLICT (cnpj) DO NOTHING;

-- 2. ACCOUNTS

-- Associação Accounts
DO $$ 
DECLARE assoc_id uuid;
BEGIN
  SELECT id INTO assoc_id FROM entities WHERE type = 'associacao';
  
  INSERT INTO public.accounts (entity_id, name, type, balance) VALUES
    (assoc_id, 'Espécie', 'cash', 0),
    (assoc_id, 'PIX (Conta BB)', 'bank', 0),
    (assoc_id, 'Conta Digital (Escolaweb)', 'virtual', 0),
    (assoc_id, 'Cofre', 'cash_reserve', 0)
  ON CONFLICT (entity_id, name) DO NOTHING;
END $$;

-- UE Accounts
DO $$ 
DECLARE ue_id uuid;
BEGIN
  SELECT id INTO ue_id FROM entities WHERE type = 'ue';
  
  INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) VALUES
    (ue_id, 'Educação Conectada UE', 'Banco do Brasil', '782-0', '37715-5', 'bank'),
    (ue_id, 'PDDE UE', 'Banco do Brasil', '782-0', '36699-4', 'bank'),
    (ue_id, 'PDDE Equidade UE', 'Banco do Brasil', '782-0', '46996-3', 'bank')
  ON CONFLICT (entity_id, name) DO NOTHING;
END $$;

-- CX Accounts
DO $$ 
DECLARE cx_id uuid;
BEGIN
  SELECT id INTO cx_id FROM entities WHERE type = 'cx';
  
  INSERT INTO public.accounts (entity_id, name, bank, agency, account_number, type) VALUES
    (cx_id, 'Educação Conectada CX', 'Banco do Brasil', '782-0', '37714-7', 'bank'),
    (cx_id, 'PDDE CX', 'Banco do Brasil', '782-0', '36761-3', 'bank'),
    (cx_id, 'PDDE Equidade CX', 'Banco do Brasil', '782-0', '46995-5', 'bank'),
    (cx_id, 'PNAE Alimentação de Verdade', 'Banco do Brasil', '782-0', '47358-8', 'bank'),
    (cx_id, 'FEE CX', 'Banco do Brasil', '782-0', '36501-7', 'bank'),
    (cx_id, 'PNAE Cartão', NULL, NULL, NULL, 'virtual')
  ON CONFLICT (entity_id, name) DO NOTHING;
END $$;

-- 3. MERCHANTS
INSERT INTO public.merchants (name, mode, balance) VALUES
  ('Bom Preço', 'saldo', 0),
  ('2 Irmãos', 'saldo', 0),
  ('Sacolão Brasil', 'saldo', 0),
  ('Fort.com', 'saldo', 0),
  ('Mercadinho Sampaio', 'saldo', 0),
  ('Fename', 'saldo', 0)
ON CONFLICT (id) DO NOTHING;

-- 4. INITIAL ADMIN (Optional/Manual)
-- To grant admin manually:
-- INSERT INTO user_roles (user_id, role) VALUES ('<USER_ID>', 'admin');
