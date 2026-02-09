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
- TanStack Query (Gerenciamento de Estado Reativo)
- Camada de Serviços Centralizada (Desacoplamento da UI)
- Sistema de Ledger Imutável (Partidas Dobradas para integridade financeira)
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
- **Setup Recomendado**: Executar `supabase/setup/FULL_SYSTEM_SETUP.sql` para inicializar o esquema completo.

**Veja o [Guia de Implantação](docs/DEPLOYMENT.md) para instruções detalhadas.**

## Últimas Atualizações (Fevereiro 2026)
- ✅ **Unificação do Ledger**: Toda a lógica financeira agora utiliza um sistema de partidas dobradas imutável.
- ✅ **Camada de Serviços**: Desacoplamento total da lógica de negócio da interface do usuário.
- ✅ **Tipagem Forte**: Implementada extensão de tipos para o Supabase, eliminando o uso de `any`.
- ✅ **Auditoria Completa**: Sistema de logs de auditoria nativo para todas as mutações financeiras.
- ✅ **Simplificação SQL**: Remoção de RPCs legadas e consolidação de segurança e permissões.
- ✅ **Reset Nuclear**: Funcionalidade de limpeza total de dados restrita a administradores.
- ✅ **Deploy Idempotente**: Script de setup robusto que permite múltiplas execuções sem conflitos.
