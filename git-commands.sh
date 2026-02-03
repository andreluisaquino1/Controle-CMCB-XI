## Comandos para Commit e Deploy

# 1. Verificar mudanças
git status

# 2. Adicionar todos os arquivos
git add .

# 3. Commit com mensagem descritiva
git commit -m "feat: implement all 10 improvement phases

- Phase 0: Remove .env, implement lazy loading for exports
- Phase 1: Create get_current_balances and get_report_summary RPCs  
- Phase 1: Rename accounts (Espécie, Cofre, PIX)
- Phase 2: Separate dashboard (current) from reports (period)
- Phase 6: Remove Fiado completely from database schema
- Phase 8: Fix hardcoded admin, implement role-based authorization

BREAKING CHANGES:
- Account names changed: Bolsinha → Espécie, Reserva → Cofre
- Transaction module enums updated
- Fiado mode and modules removed
- Dashboard hook no longer accepts period parameters

See DEPLOYMENT.md for critical security steps before deploying."

# 4. Push (APÓS rotacionar chaves do Supabase!)
git push origin main
