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
- **Nível de Acesso**: No perfil, você pode visualizar se sua conta tem permissão de **Administrador**, **Usuário Comum** ou **Demonstração**.
- **Status da Conta**: Caso sua conta ainda não tenha sido autorizada, você verá uma tela de bloqueio informando **"Aguardando Ativação"**. Ao entrar no sistema, sua conta já estará plenamente ativa.

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
- **Espécie**: Registrado como módulo `mensalidade` na conta Espécie.
- **PIX**: Registrado como módulo `mensalidade_pix` na conta PIX (Banco do Brasil).
- **Exemplo**: Recebimento de R$ 300,00 em dinheiro e R$ 150,00 via PIX dos secretários.

#### **2. Despesa Associação (Saída)**
Pagamento direto de despesas utilizando saldo da Associação.
- **Forma de Registro**: O sistema funciona agora exclusivamente em modo de **Lote**, permitindo registrar um ou múltiplos itens no mesmo lançamento.
- **Campos**: Meio de Pagamento (Espécie/PIX) no cabeçalho.
- **Tabela de Itens**: Clique em **"+ Item"** para adicionar linhas. Cada item possui sua própria **Data**, **Valor** e **Descrição**.
- **Exemplo**: Pagamento de material de limpeza e material de escritório no mesmo diálogo, cada um com sua data específica.

#### **3. Movimentar Saldo (Transferência)**
Transferência de valores entre contas internas.
- **Uso Comum**: Sangria (Retirar do Espécie para Cofre) ou Depósito (Espécie para Banco).
- **Taxas**: É possível registrar taxas bancárias incidentes na transferência.

#### **4. Ajustar Saldo (Correção)**
Ferramenta administrativa para correção de saldos em caso de divergência.
- **Atenção**: Use com cautela. O sistema exibirá uma **confirmação de segurança** mostrando o impacto antes da conclusão.

#### **5. Taxas PIX (Lote)** ✨ *Novo*
Lançamento consolidado de taxas cobradas pelo Banco do Brasil por transações PIX.
- **Campos**: Referência do Lote, Data, Lista de Itens (Valor + Descrição + Data opcional).
- **Funcionamento**: O sistema cria uma "transação mãe" com o valor total e registra cada item individualmente para rastreabilidade.
- **Visualização**: Na tabela de histórico, transações de taxa PIX exibem um botão **"Ver itens"** para consultar os valores individuais.
- **Exemplo**: Lançar 15 taxas de R$ 0,50 referentes à semana 1 de março.

#### **6. PIX Fantasma (PIX Não Identificado)** ✨ *Novo*
Registro de valores que entraram via PIX na conta BB mas não foram identificados como mensalidade de nenhum assistido.
- **Campos**: Data, Valor, Descrição/Referência.
- **Uso**: Durante o fechamento, utilize para registrar a diferença entre o extrato bancário e as mensalidades identificadas.
- **Exemplo**: Ao conferir o extrato, nota-se que entraram R$ 1.500,00 mas apenas R$ 1.350,00 foram identificados. O valor de R$ 150,00 deve ser lançado como "PIX Fantasma".

### Segurança e Validação
Para garantir a integridade da auditoria, o sistema agora exige:
- **Justificativas Obrigatórias**: Qualquer anulação, ajuste ou movimentação exige uma descrição de no mínimo **5 caracteres**.
- **Confirmações de Ação**: Operações críticas (anular, ajustar, transferir) agora exibem um diálogo de confirmação para evitar cliques acidentais.
- **Validação de Duplicidade**: O sistema impede lançamento duplicado de mensalidade (Espécie ou PIX) para o mesmo turno e data.

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
- **Forma de Registro**: Realizado via lançamento em **Lote**. Permite registrar vários itens comprados no mesmo estabelecimento, com descrições e datas específicas por item.
- **Uso**: Útil para compras grandes com diversos itens que precisam de descrição individual.
- **Exemplo**: Compra de lanches e materiais de copa no Supermercado XYZ. Cada item é lançado com seu valor, descrição e data.

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
- **Funcionalidade**: Esta operação serve tanto para pagamentos diretos quanto para **Aportar Saldo** em estabelecimentos cadastrados.
- **Lançamento em Lote**: Permite lançar vários gastos de recurso de uma só vez, informando a data individual para cada item.
- **Exemplo**: Transferência de valores para o Supermercado para pagar diversas notas fiscais de datas distintas de uma só vez.

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

### Usuários (Exclusivo Admin)
- Permite cadastrar novos usuários, ativar/desativar acessos e definir permissões (Admin, Usuário Comum, Visitante).
- **Importante**: Por segurança, estas rotas são acessíveis apenas para administradores.

### Logs e Auditoria (Exclusivo Admin)
- Exibe um registro imutável de todas as **Anulações** e **Eventos de Segurança** (como mudanças de cargos).
- **Filtros**: Agora você pode filtrar por data, usuário ou tipo de ação.
- Garante transparência e segurança nas correções de lançamentos.
