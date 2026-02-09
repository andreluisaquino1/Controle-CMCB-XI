# CMCB-XI - Instruções de Implantação

## ⚠️ AÇÕES CRÍTICAS ANTES DE FAZER PUSH

### 1. Remover arquivo .env (IMPORTANTE!)
```powershell
# O arquivo .env foi removido do repositório
# NUNCA faça commit dele novamente!
```

### 2. Rotacionar Chaves do Supabase

Como o arquivo `.env` já foi commitado anteriormente no git, as chaves estão expostas no histórico. **É CRÍTICO rotacionar as chaves:**

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Vá em Settings > API
3. Clique em "Reset anon key" e "Reset service_role key"
4. Copie as novas chaves

### 3. Configurar Variáveis de Ambiente no Vercel

Acesse https://vercel.com/seu-projeto/settings/environment-variables e adicione:

```
VITE_SUPABASE_PROJECT_ID=rqwbtlriiycirsukqmux
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_PUBLIC_SITE_URL`: (Optional) URL for auth redirects (e.g. https://cmcb-xi.vercel.app)
```

### 4. Aplicar Estrutura no Supabase

O banco de dados agora segue uma arquitetura consolidada em um único arquivo de setup.

**Opção A: Instalação Inicial ou Reset (Recomendado)**
1. Acesse o Supabase Dashboard SQL Editor.
2. Execute o conteúdo de `supabase/setup/FULL_SYSTEM_SETUP.sql`.
3. Este script cria todas as tabelas, enums, triggers e as políticas RLS. 
   - *Nota: O script agora é **idempotente**, podendo ser executado repetidamente para aplicar atualizações sem causar erros de "objeto já existe".*

**Opção B: Atualização de Sistema Existente**
Se você já tem o sistema rodando e quer apenas aplicar as melhorias de Fevereiro de 2026:
1. Execute `supabase/migrations/2026-02-09_ledger_unification.sql` (Unificação do Ledger).
2. Execute `supabase/migrations/2026-02-09_sql_simplification.sql` (Limpeza de Legado e Reset Admin).
2. Este script alinha o schema da `ledger_transactions` e atualiza as funções de resumo.

### 5. Verificar Instalação

Após o setup, valide a integridade do Ledger:

```sql
-- 1. Verificar se a visualização de saldos está online
SELECT * FROM public.ledger_balances;

-- 2. Validar que as funções de resumo usam o ledger
-- O resultado deve mostrar referências à tabela 'ledger_transactions'
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_dashboard_summary';

-- 3. Verificar presença de metadados críticos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ledger_transactions' 
AND column_name IN ('module', 'entity_id', 'payment_method');
```

### 6. Deploy no Vercel

```powershell
# Commit das mudanças arquiteturais
git add .
git commit -m "chore: architecture unification - immutable ledger and service layer"

# Push para o repositório
git push origin main
```

O Vercel processará o build e o deploy automaticamente.

## ✅ Arquitetura e Melhorias (Fev/2026)

### Sistema de Ledger (Partidas Dobradas)
- **Imutabilidade**: Transações no ledger não podem ser alteradas ou excluídas (protegidas por triggers).
- **Consistência**: Saldo das contas é uma **view calculada** em tempo real a partir do histórico de lançamentos.
- **Anulação**: Erros são corrigidos via `void_transaction`, que cria um contra-lançamento negativo para histórico auditável.

### Camada de Serviços (Desacoplamento)
- A lógica de negócio reside exclusivamente em `src/services/`.
- A UI consome apenas serviços, ignorando detalhes de implementação do Supabase ou RPCs.

### Resumos e Relatórios
- **Fonte Única**: O Dashboard e Relatórios agora leem 100% da `ledger_transactions`.
- **Desempenho**: Metadados indexados para filtragem rápida por módulo e entidade.


## 🔗 Links Úteis

- Dashboard Supabase: https://supabase.com/dashboard/project/rqwbtlriiycirsukqmux
- Vercel Dashboard: https://vercel.com
- Documentação do Projeto: Veja o [README.md](../README.md)
