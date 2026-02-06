# Deploy Checklist - CMCB-XI Dashboard

Para garantir a integridade do sistema durante o deploy de novas funcionalidades (especialmente mudanças de banco de dados e RLS), siga este checklist:

## 1. Banco de Dados (Supabase)
- [ ] Aplicar novas migrações na ordem cronológica (pastas `supabase/migrations`).
- [ ] **Importante**: Verificar se novas políticas de RLS não bloqueiam o fluxo básico de usuários `user` e `demo`.
- [ ] Testar novas RPCs diretamente no Editor SQL se houver mudanças na lógica de saldo.

## 2. Frontend (Build)
- [ ] Executar `npm run build` para garantir que não há erros de TypeScript.
- [ ] Verificar se as variáveis de ambiente do Supabase estão configuradas corretamente no ambiente de deploy (Vercel/Netlify).

## 3. Testes de Fumaça (Smoke Tests)
- [ ] **Login**: Testar login com usuário admin e usuário comum.
- [ ] **Saldos**: Confirmar que o resumo do Dashboard carrega sem erros.
- [ ] **Lançamento**: Realizar um lançamento de teste e verificar o impacto no saldo.
- [ ] **Anulação**: Anular o lançamento de teste e confirmar se a justificativa foi gravada no log.
- [ ] **Segurança**: Tentar acessar `/usuarios` ou `/logs` com um usuário não-admin (deve redirecionar para a home).

## 4. Verificação de Dados
- [ ] Rodar `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;` para confirmar que ações críticas estão sendo auditadas.
