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

### 4. Aplicar Migrações no Supabase

As migrações estão em `supabase/migrations/`. Você precisa aplicá-las na ordem:

**Opção A: Via Supabase CLI (Recomendado)**
```powershell
# Instalar Supabase CLI se não tiver
npm install -g supabase

# Fazer login
supabase login

# Link com seu projeto
supabase link --project-ref rqwbtlriiycirsukqmux

# Aplicar todas as migrações pendentes
supabase db push
```

**Opção B: Via Dashboard**
1. Acesse https://supabase.com/dashboard/project/rqwbtlriiycirsukqmux/sql
2. Copie e execute cada arquivo SQL na ordem:
   - `2026-02-08_fix_ledger_balances.sql`
   - `2026-02-09_settings_support_contact.sql`.sql`
   - `20260203_phase8_admin_role.sql`

### 5. Verificar Instalação

Após aplicar as migrações, verifique:

```sql
-- Verificar se as RPCs existem
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_current_balances', 'get_report_summary');

-- Verificar nomes das contas
SELECT name FROM accounts WHERE entity_id IN (
  SELECT id FROM entities WHERE type = 'associacao'
);
-- Deve retornar: Espécie, Cofre, PIX

-- Verificar role do admin
SELECT u.email, ur.role 
FROM user_roles ur 
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

### 6. Deploy no Vercel

```powershell
# Commit das mudanças
git add .
git commit -m "feat: implement all improvement phases - security, architecture, permissions"

# Push para o repositório
git push origin main
```

O Vercel vai fazer deploy automaticamente.

## ✅ Mudanças Implementadas

### Fase 0 - Segurança
- ✅ Lazy loading para bibliotecas de exportação (xlsx, jspdf, html2canvas)
- ✅ Code splitting no vite.config.ts
- ✅ Arquivo .env removido

### Fase 1 - Arquitetura do Banco
- ✅ RPC `get_current_balances()` criada
- ✅ RPC `get_report_summary(start_date, end_date)` criada
- ✅ Contas renomeadas: Bolsinha → Espécie, Reserva → Cofre, BB Associação → PIX
- ✅ Enums atualizados (especie_transfer, cofre_ajuste, etc.)

### Fase 2 - Dashboard
- ✅ Hook `useDashboardData()` agora retorna apenas saldos atuais
- ✅ Hook `useReportData(start, end)` criado para relatórios
- ✅ Removida dependência de período do Dashboard

### Fase 6 - Remover Fiado
- ✅ Enum `merchant_mode` agora aceita apenas 'saldo'
- ✅ Enums `transaction_module` sem fiado_registro/fiado_pagamento
- ✅ Merchants com mode='fiado' desativados
- ✅ Transações de fiado marcadas como voided

### Fase 8 - Permissões
- ✅ UsuariosPage usa `isAdmin` do contexto (não mais hardcoded)
- ✅ RLS policy para admins visualizarem todos os perfis
- ✅ Seed do role admin para andreluis_57@hotmail.com

## 📝 Notas Importantes

1. **Saldo negativo em estabelecimentos**: Sistema vai PERMITIR com aviso visual
2. **Admin único**: Apenas seu usuário terá role de admin por enquanto
3. **Fiado**: Completamente removido do sistema
4. **Build version**: NÃO exibida (sem rodapé)

## 🐛 Troubleshooting

### Build falha no Vercel
- Verifique se as variáveis de ambiente estão configuradas
- Confirme que as novas chaves do Supabase estão corretas

### Erro "RPC not found"
- Execute as migrações do Phase 1 primeiro
- Verifique se aplicou via `supabase db push` ou manualmente no dashboard

### Usuário não consegue acessar página de Usuários
- Execute a migração do Phase 8
- Verifique se o email está correto na migração
- Role admin só é atribuído após a migração

## 🔗 Links Úteis

- Dashboard Supabase: https://supabase.com/dashboard/project/rqwbtlriiycirsukqmux
- Vercel Dashboard: https://vercel.com
- Documentação Supabase: https://supabase.com/docs
