# CMCB-XI Finance Hub

Sistema de controle financeiro operacional do Colégio Militar 02 de Julho – Unidade XI.

## ⚠️ IMPORTANTE - Leia Antes de Fazer Deploy
**CRÍTICO**: Antes de fazer push ou deploy, leia o arquivo [DEPLOYMENT.md](./DEPLOYMENT.md) com instruções de segurança e rotação de chaves.

## Funcionalidades
- Controle de Associação (Espécie, PIX, Cofre)
- Saldos de Estabelecimentos  
- Controle de Recursos (UE e CX)
- Relatórios (WhatsApp, Exportação Excel/PDF)
- Gestão de Usuários (Admin)
- Logs de Auditoria

## Tecnologias
- React + TypeScript + Vite
- Supabase (PostgreSQL + Auth)
- TanStack Query
- Shadcn/ui + Tailwind CSS

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env
# Preencher com suas credenciais do Supabase

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Deploy
- Deploy automático via Vercel
- Variáveis de ambiente devem estar configuradas no Vercel
- Migrações devem ser aplicadas manualmente no Supabase

**Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instruções completas.**

## Últimas Atualizações (2026-02-03)
- ✅ Removido sistema de Fiado completamente
- ✅ Separação clara entre saldos atuais e relatórios por período
- ✅ Implementado lazy loading para exportações (redução de bundle)
- ✅ Corrigido sistema de permissões (role-based em vez de hardcoded)
- ✅ Renomeação de contas: Espécie, Cofre, PIX
