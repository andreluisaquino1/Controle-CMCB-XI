# Supabase SQL Organization - CMCB-XI

Este diretório contém a estrutura de banco de dados organizada e consolidada para ser aplicada no Supabase.

## Como Aplicar

Você tem duas opções para configurar ou atualizar seu banco de dados:

### Opção 1: Configuração Completa (Recomendado para novos ambientes)
Use o arquivo `FULL_SYSTEM_SETUP.sql`. Ele contém toda a estrutura (tabelas, enums, triggers e RPCs) em ordem correta de execução.
1. Abra o **SQL Editor** no painel do Supabase.
2. Copie e cole o conteúdo de `FULL_SYSTEM_SETUP.sql`.
3. Clique em **Run**.

### Opção 2: Organização Modular
Se preferir aplicar em etapas ou revisar partes específicas, use os arquivos na pasta `sql/`:

1. `01_schema.sql`: Criação de enums, tipos e tabelas base.
2. `02_security.sql`: Configuração de RLS (Row Level Security), triggers de auditoria e helpers de autenticação.
3. `03_functions.sql`: Lógica de negócio via RPCs (processamento atômico de transações, anulações, resumos do dashboard).
4. `04_seed.sql`: Dados iniciais (Entidades, Contas e Estabelecimentos).

---

## Observação sobre Usuário Admin
Após aplicar os scripts, você deve designar manualmente o primeiro usuário administrador para ter acesso às telas de Log e Usuários:

```sql
-- Substitua pelo ID do seu usuário (encontrado em Authentication > Users)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('SEU_USER_ID_AQUI', 'admin')
ON CONFLICT DO NOTHING;
```
