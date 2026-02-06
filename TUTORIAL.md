# Manual do Usuário - Sistema Financeiro CMCB-XI (Versão Tenente)

Este manual técnico detalha o funcionamento, regras de negócio e fluxos operacionais do Sistema Financeiro do CMCB-XI. Ele foi desenhado para capacitar Oficiais e gestores na operação completa da ferramenta.

## Sumário Executivo

1.  [Conceitos Fundamentais](#1-conceitos-fundamentais)
2.  [Visão Geral (Dashboard)](#2-visão-geral-dashboard)
3.  [Módulo: Associação de Pais](#3-módulo-associação-de-pais)
4.  [Módulo: Saldos e Fornecedores](#4-módulo-saldos-e-fornecedores)
5.  [Módulo: Recursos Públicos (UE e CX)](#5-módulo-recursos-públicos-ue-e-cx)
6.  [Relatórios e Prestação de Contas](#6-relatórios-e-prestação-de-contas)
7.  [Auditoria e Segurança](#7-auditoria-e-segurança)
8.  [FAQ e Solução de Problemas](#8-faq-e-solução-de-problemas)

---

## 1. Conceitos Fundamentais

O sistema gerencia três entidades fiscais distintas, garantindo a separação estrita dos recursos:

1.  **Associação de Pais (APM)**: Recursos privados (Recebimento de Mensalidades). Gerencia despesas livres e manutenção rápida.
2.  **Unidade Executora (UE)**: Recursos Federais (PDDE). Verba carimbada com regras rígidas de aplicação.
3.  **Caixa Escolar (CX)**: Recursos Estaduais/Merenda. Também possui regras estritas.

### Tipos de Contas
O sistema classifica o dinheiro em quatro locais possíveis:
-   **Espécie (Caixa Físico)**: Dinheiro vivo mantido com os Oficiais.
-   **Bancária (Banco do Brasil)**: Conta corrente principal para movimentação PIX e transferências.
-   **Conta Digital (Escolaweb)**: Plataforma de cobrança de boletos. **Nota Importante:** Esta conta é apenas de *Passagem*. O dinheiro entra via boleto e deve ser transferido para o Banco do Brasil (via PIX) para ser utilizado. O sistema bloqueia pagamentos diretos desta conta.
-   **Cofre (Reserva)**: Dinheiro físico separado do caixa diário para segurança.

---

## 2. Visão Geral (Dashboard)

O painel inicial é um raio-x financeiro instantâneo.
-   **Ações Rápidas**: Botões de atalho para as operações mais frequentes (Receber mensalidade, registrar pagamento rápido da associação e gastos nos estabelicimentos).
-   **Cards de Saldo**: Cada um dos saldos são segregados. O saldo da "Associação" **não se mistura** com o saldo da "UE" ou "CX".
-   **Saldos em Estabelecimentos**: Mostra a posição consolidada de crédito ou dívida junto aos fornecedores.
    -   *Verde*: A instituição tem crédito antecipado (pagou adiantado).
    -   *Vermelho*: A instituição consumiu itens e precisa pagar (conta "pendurada").

---

## 3. Módulo: Associação de Pais

Este é o módulo de uso diário intenso.

### 3.1. Mensalidades (Entradas)
Entrada padrão de recursos.
-   **Fluxo**: Selecione a Data, o Turno (Manhã/Tarde) e os valores repassados pelos secretários.
-   **Validação**: O sistema impede lançar dois registros para o mesmo Turno + Data para evitar duplicidade. Caso precise corrigir, anule o lançamento anterior primeiro.

### 3.2. Despesas (Saídas)
O sistema utiliza um método padronizado de **lançamento múltiplo** para agilizar a digitação.
-   **Como funciona**: Você define a origem do pagamento (ex: Conta BB via PIX) no cabeçalho. Em seguida, adiciona linha por linha cada compra da mesma origem, podendo ser de diferentes fornecedores.

### 3.3. Movimentações Internas (Transferências)
Usado para registrar o trânsito do dinheiro.

-   **Sangria**: Transferir do *Espécie* para o *Cofre* (Segurança).
-   **Depósito Bancário**: Transferir do *Espécie* para *Banco do Brasil*.
-   **Baixa de Escolaweb**: Transferir da *Conta Digital* para *Banco do Brasil*.

### 3.4. PIX Fantasma (Reconciliação)

-   **Problema**: O extrato bancário mostra um PIX recebido de R$ 150,00, mas ninguém identificou o aluno pagante.
-   **Solução**: Lance como "PIX Fantasma". Isso permite fechar o caixa (saldo do sistema bater com o banco) enquanto a origem do dinheiro é investigada. Futuramente, pode-se anular esse lançamento e lançar a mensalidade correta.

### 3.5. Taxas PIX em Lote
O Banco do Brasil cobra tarifas PIX a cada transação.
-   **Funcionalidade**: Permite lançar o valor total debitado no extrato e detalhar (se desejar) a quais dias se refere. Essencial para que o saldo bata com os centavos do banco.

---

## 4. Módulo: Saldos e Fornecedores

Gerencia a relação com terceiros (Mercados, Papelarias, Prestadores de Serviço).

### 4.1. Lógica de Crédito e Débito
O sistema opera com conta corrente:
1.  **Aporte (Depósito)**: Você envia dinheiro (Recursos) para o fornecedor. Isso gera **Crédito Positivo**.
2.  **Consumo (Gasto)**: Você retira produtos. Isso consome o saldo.

### 4.2. Saldo Negativo e Avisos
-   Se consumir mais do que tem de crédito, o saldo fica **Negativo (Vermelho)**.
-   **Aviso de Gerente**: O sistema emitirá um alerta amarelo ("Atenção: Saldo ficará negativo"), mas **permitirá** a operação. Isso quando o fornecedor permite "pendurar" a conta para pagar depois.

### 4.3. Gestão de Inativos
Para manter o cadastro limpo:
-   Forncedores que não são mais usados devem ser **Desativados** (ícone lixeira).
-   Eles somem do dia a dia, mas seu histórico financeiro é preservado para auditoria.
-   Podem ser consultados marcando a opção **"Mostrar Inativos"** e reativados a qualquer momento.

---

## 5. Módulo: Recursos Públicos (UE e CX)

Designado para contas PDDE, Merenda, Manutenção.

### 5.1. Rigidez Fiscal
Diferente da Associação, aqui não existem caixas "Físicos" ou "Cofre". Toda movimentação é estritamente bancária para atender às normas da prestação de contas governamental.

### 5.2. Tipos de Gasto
-   **Pagamento Direto**: Pagar uma nota fiscal à vista via transferência.
-   **Aporte em Estabelecimento**: Transferir um valor global para um fornecedor (ex: Supermercado) para ir consumindo aos poucos (Merenda).

---

## 6. Relatórios e Prestação de Contas

Ferramentas para transparência junto ao comando e comunidade.

### 6.1. Relatório PDF Oficial
Gera documento A4 formatado contendo:
-   **Resumo Executivo**: Total arrecadado, total gasto por categoria (PIX, Espécie).
-   **Extrato Analítico**: Tabela linha a linha de cada centavo movimentado no período.
-   Ideal para anexar em processos físicos ou arquivamento.

### 6.2. Resumo para WhatsApp
Gera um texto (copy-paste) pré-formatado para ser enviado no grupo dos Oficiais.

### 6.3. Auditoria de Saldos
No final de cada período, o saldo final apresentado no relatório **DEVE** bater exatamente com o extrato bancário e a contagem física do cofre. Se houver divergência de R$ 0,01, utilize a função de **Reconciliação** (PIX Fantasma ou Ajuste de Saldo) para corrigir e justificar.

---

## 7. Auditoria e Segurança

O sistema protege a integridade dos dados financeira.

-   **Imutabilidade**: Transações não podem ser "editadas" para mudar valores. Se houve erro, a transação deve ser **Anulada (Void)** e refeita.
-   **Rastro de Auditoria (Logs)**:
    -   Toda anulação exige uma **Justificativa** por escrito (mínimo 5 caracteres).
    -   O Log grava: Quem fez, Quando fez, O que era antes, O que virou depois e Por que mudou.
-   **Acesso Técnico**: Todos os Oficiais podem visualizar a **Trilha de Auditoria** (Logs de Segurança). Apenas perfis `Admin` podem gerenciar usuários.

---

## 8. FAQ e Solução de Problemas

**P: Lancei uma mensalidade no dia errado. Como corrigir?**
R: Vá em Associação > Histórico (aba inferior). Localize o lançamento, clique na Lixeira, justifique ("Erro de data") e confirme. Depois, faça o lançamento correto.

**P: O saldo do banco não bate com o sistema.**
R: Verifique se todas as **Taxas PIX** foram lançadas. Verifique se algum **PIX recebido** não foi lançado (use o PIX Fantasma).

**P: Não consigo selecionar uma conta antiga para transferência.**
R: Verifique se ela foi desativada. Vá em Recursos ou Saldos, marque "Mostrar Inativos" e reative a conta se necessário.

**P: O sistema travou ao tentar salvar um gasto.**
R: Verifique se todos os campos obrigatórios (especialmente no lançamento em lote, como datas dos itens) estão preenchidos.

---
*Manual atualizado em: 06/02/2026*
