# Manual do Usuário - Sistema Financeiro CMCB-XI

Bem-vindo ao manual completo do Sistema Financeiro CMCB-XI. Este documento detalha todas as funcionalidades do sistema, organizadas por abas e módulos.

## Índice

1. [Acesso e Perfil](#1-acesso-e-perfil)
2. [Dashboard (Visão Geral)](#2-dashboard-visão-geral)
3. [Associação](#3-associação)
4. [Saldos em Estabelecimentos](#4-saldos-em-estabelecimentos)
5. [Recursos (UE e Caixa Escolar)](#5-recursos-ue-e-caixa-escolar)
6. [Relatórios](#6-relatórios)
7. [Administração e Logs](#7-administração-e-logs)

---

## 1. Acesso e Perfil

### Login
Ao acessar o sistema, utilize seu e-mail e senha cadastrados.
- **Esqueci a senha**: Na tela de login, clique em "Recuperar senha" para receber um link de redefinição por e-mail.

### Perfil e Configurações
Acesse clicando em **Perfil** no menu lateral.
- **Alterar Nome**: Atualize seu nome de exibição.
- **Alterar Senha**: Permite trocar sua senha atual por uma nova.
- **Status da Conta**: Exibe se seu usuário está "Ativo" ou "Pendente".

---

## 2. Dashboard (Visão Geral)

O **Painel Principal** oferece um resumo imediato da saúde financeira da instituição.

### Funcionalidades:
- **Resumo Financeiro**: Exibe o saldo consolidado das contas da Associação:
  - **Espécie**: Dinheiro físico em caixa.
  - **PIX (BB)**: Saldo bancário da conta de movimento.
  - **Conta Digital**: Saldo na plataforma de cobrança (Escolaweb).
  - **Cofre**: Reserva física.
- **Ações Rápidas**: Atalhos para as operações mais comuns (Mensalidade, Despesa Associação e Gasto Estabelecimento).
- **Saldos dos Estabelecimentos**: Mostra quanto crédito ou débito a instituição possui em cada fornecedor cadastrado.
- **Recursos (UE/CX)**: Resumo dos saldos bancários das contas de recursos federais/estaduais.

---

## 3. Associação

Esta aba é destinada à gestão exclusiva dos recursos próprios da Associação de Pais.

### Contas Gerenciadas
- **Espécie**, **PIX**, **Conta Digital** e **Cofre**.

### Operações Disponíveis:

#### **1. Mensalidades (Entrada)**
Registro do recebimento de mensalidades recebidas por turno.
- **Campos**: Data, Turno (Manhã/Tarde), Valores (Espécie/PIX), Observação.
- **Exemplo**: Recebimento de R$ 300,00 em dinheiro dos secretários.

#### **2. Despesa Associação (Saída)**
Pagamento direto de despesas utilizando saldo da Associação.
- **Campos**: Data, Meio de Pagamento (Espécie/PIX...), Valor, Descrição.
- **Exemplo**: Pagamento de R$ 100,00 via PIX para compra de material de limpeza.

#### **3. Movimentar Saldo (Transferência)**
Transferência de valores entre contas internas.
- **Uso Comum**: Sangria (Retirar do Espécie para Cofre) ou Depósito (Espécie para Banco).
- **Taxas**: É possível registrar taxas bancárias incidentes na transferência.

#### **4. Ajustar Saldo (Correção)**
Ferramenta administrativa para correção de saldos em caso de divergência.
- **Atenção**: Use com cautela, pois altera o saldo diretamente sem contrapartida financeira comum.

### Histórico
Tabela completa de todas as movimentações da Associação. Use o botão de **Lixeira** para anular um lançamento incorreto (requer justificativa).

---

## 4. Saldos em Estabelecimentos

Módulo para controle de contas correntes em fornecedores (supermercados, papelarias, etc).

### Conceito
O sistema controla quanto crédito a instituição possui em cada local.
- **Saldo Positivo (Verde)**: Temos crédito para gastar.
- **Saldo Negativo (Vermelho)**: Devemos ao estabelecimento.

### Operações Disponíveis:

#### **Aportar Saldo (Pagar ao Fornecedor)**
Envia dinheiro da instituição para o estabelecimento, gerando crédito.
- **Origem dos Recursos**: Pode vir da Associação, Unidade Executora (UE) ou Caixa Escolar (CX).
- **Exemplo**: Transferir R$ 1.000,00 da conta PDDE (UE) para o Supermercado XYZ. O saldo no mercado aumentará.

#### **Registrar Gasto (Consumo)**
Baixa o saldo do estabelecimento quando uma compra é feita.
- **Exemplo**: Compra de lanche no valor de R$ 200,00 no Supermercado XYZ. O saldo do mercado diminuirá.

#### **Gerenciar Estabelecimentos**
- **Novo Estabelecimento**: Cadastra um novo fornecedor.
- **Editar/Excluir**: Ícones visíveis nos cartões de cada estabelecimento.

---

## 5. Recursos (UE e Caixa Escolar)

Gestão das contas bancárias vinculadas a verbas públicas (PDDE, Merenda, etc).

### Contas
- **Unidade Executora (UE)**: Recursos federais diretos.
- **Caixa Escolar (CX)**: Recursos estaduais/federais para alimentação/manutenção.

### Operações:

#### **Entrada de Recurso**
Registra o ingresso de verba na conta bancária (repasse).
- **Exemplo**: Recebimento de R$ 5.000,00 de repasse PDDE na conta do Banco do Brasil.

#### **Gasto de Recurso (Pagamento/Aporte)**
Registro de saída de valores da conta de recurso.
- **Funcionalidade**: Esta operação serve tanto para pagamentos diretos quanto para **Aportar Saldo** em estabelecimentos cadastrados (transferindo crédito para o fornecedor).
- **Exemplo**: Transferência de valor para o Supermercado para criar crédito futuro ou pagar uma compra específica.

#### **Gerenciar Contas**
Botão **"Nova Conta"** para cadastrar novas contas bancárias. Ícones de lápis e lixeira nos cartões para editar/arquivar contas existentes.

---

## 6. Relatórios

Central de prestação de contas.

### Funcionalidades:
- **Filtro de Data**: Selecione o período desejado (Início e Fim).
- **Preview WhatsApp**: Gera um texto formatado automaticamente com o resumo do período, pronto para envio em grupos de prestação de contas.
  - **Opção "Incluir saldos dos Recursos"**: Adiciona ao resumo os saldos das contas UE/CX.
- **Exportar PDF**: Gera um documento oficial contendo o resumo e a tabela detalhada de todas as transações do período.
- **Histórico Detalhado**: Tabela pesquisável de todas as operações. Use os filtros para ver apenas "Mensalidades" ou "Gastos", por exemplo.

---

## 7. Administração e Logs

### Usuários (Apenas Admin)
- Permite cadastrar novos usuários, ativar/desativar acessos e definir permissões (Admin, Usuário Comum, Visitante).
- **Importante**: Novos cadastros ficam como "Pendentes" até que um Admin os ative nesta tela.

### Logs (Auditoria)
- Exibe um registro imutável de todas as **Anulações** de transações feitas no sistema.
- Mostra: Quem anulou, quando, qual foi a transação original e o motivo justificado.
- Garante transparência e segurança nas correções de lançamentos.
