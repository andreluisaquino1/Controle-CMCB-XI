-- Adicionar coluna active para contas (UE/CX/Associação)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Garantir que registros existentes sejam marcados como ativos
UPDATE accounts SET active = true WHERE active IS NULL;
