# Manual do Usuário - Sistema Financeiro CMCB-XI (Versão Final)

Este documento apresenta todas as funcionalidades do sistema, detalhando abas, funções e exemplos de uso prático para a gestão da Associação, Unidade Executora e Caixa Escolar.

---

## 1. Institucional e Acesso

O sistema gerencia três entidades distintas para o CMCB-XI:

1.  **Associação de Pais e Mestres**: Gestão de mensalidades dos alunos do Colégio Militar e custeio operacional imediato.
2.  **Unidade Executora (UE)**: Responsável por recursos federais diretos (FNDE/PDDE).
3.  **Caixa Escolar (CX)**: Gere repasses estaduais e alimentação escolar (Merenda).

**Perfis de Acesso:**
*   **Admin**: Acesso total, gestão de usuários, ativação de contas e limpeza de dados (Reset).
*   **Usuário**: Operação diária completa (lançamentos, anulações e relatórios) para todas as entidades (Assoc, UE, CX).
*   **Secretária**: Perfil focado na secretaria escolar. 
    *   *Restrições*: Visualiza apenas a aba **Associação** e seu **Perfil**. 
    *   *Fluxo*: Todos os lançamentos realizados por este perfil entram como **Pendente** e precisam ser validados por um Admin ou Usuário para afetarem o saldo final. Não possui permissão para anular ou validar.
*   **Visitante/Demonstração**: Modo simulação. Permite realizar lançamentos e testes que ficam salvos apenas no seu navegador, sem afetar os dados reais da escola e sem visualizar os dados reais.
    Login: teste@teste.com 
    Senha: teste1

---

## 2. Abas e Funcionalidades

### 2.1 Dashboard (Visão Geral e Atalhos)
**Função**: Centralizar a saúde financeira e oferecer acesso rápido às tarefas comuns.
*   **Saldos em Tempo Real**: Mostra o total disponível em **Espécie**, **Banco (PIX)**, **Conta Digital** e **Cofre**.
*   **Saldos dos Estabelecimentos**: Lista rápida de fornecedores onde há crédito ou débito.
*   **Ações Rápidas (Atalhos)**:
    *   **Mensalidade**: Atalho para registro de entrada de alunos (mesma função da aba Associação).
    *   **Despesa Associação**: Atalho para pagamento direto (mesma função da aba Associação).
    *   **Gasto Estabelecimento**: Atalho para abater saldo em mercado (mesma função da aba Saldos).
    > [!NOTE]
    > Estes botões são **atalhos** das funções completas encontradas nas abas específicas abaixo.

### 2.2 Associação (Recursos Próprios)
**Função**: Gestão de mensalidades dos alunos e custeio operacional imediato.
*   **Botão [Mensalidades]**: Registro de valores recebidos.
    *   *Como usar*: Recebeu R$ 300,00 da secretaria no turno manhã? Clique em Mensalidades, selecione "Manhã" e insira o valor. O sistema divide automaticamente entre Espécie e PIX se necessário.
*   **Botão [Despesa Associação]**: Pagamento direto de serviços/materiais.
    *   *Como usar*: Pagou R$ 20,00 em um xerox? Clique aqui, escolha o meio (Espécie/PIX) e descreva o gasto. Isso retira o valor diretamente do saldo da Associação.
*   **Botão [Movimentar Saldo]**: Transferência entre as contas internas (Ex: Banco para Cofre).
    *   *Como usar*: Retirou R$ 1.000,00 do dinheiro em espécie para guardar no Cofre físico? Selecione origem "Espécie", destino "Cofre" e o valor.
*   **Botão [PIX Fantasma]**: Registrar créditos no extrato bancário sem origem identificada.
    *   *Como usar*: Apareceu um PIX de R$ 50,00 no extrato mas não sabe quem enviou? Use esta função para o saldo bater, e identifique-o depois.
    *   *Exemplo*: Verificou o extrato do Banco do Brasil e há um crédito de R$ 50,00 'PIX RECEBIDO - CPF ***.123.456-**'. Use este botão para registrar a entrada agora e ajustar para o aluno correto futuramente.
*   **Botão [Taxas PIX]**: Lançamento rápido de tarifas bancárias em lote.
    *   *Como usar*: No fim da semana, lance todas as tarifas de manutenção da conta e de envio e recebimento de pix de uma só vez para simplificar a conciliação.
    *   *Exemplo*: O Banco descontou 'TARIFA MENSALIDADE' de R$ 55,00 e 'TARIFA DE RECEBIMENTO DE PIX' de R$ 1,00? Clique aqui e lance os R$ 56,00 totais como taxa.
*   **Botão [Ajustar Saldo]**: Correções pontuais (erros de digitação ou saldo inicial).
    *   *Como usar*: O saldo físico da Espécie está R$ 5,00 diferente? Use o Ajuste com a justificativa "Acerto de quebra de caixa".

### 2.3 Saldos em Estabelecimentos (Contas Correntes)
**Função**: Controle de verba "pré-paga" enviada para fornecedores.
*   **Botão [Novo Estabelecimento]**: Cadastrar um novo mercado ou fornecedor recorrente.
    *   *Como usar*: Quer começar a comprar no "Mercado do João"? Clique aqui e insira o nome para ele aparecer na lista.
*   **Botão [Aporte]**: Enviar dinheiro (da Assoc/UE/CX) para o fornecedor.
    *   *Como usar*: Fez um PIX de R$ 2.000,00 da conta PDDE para o "Supermercado X"? Clique em Aporte, selecione a conta de origem (UE > PDDE) e o mercado destino.
*   **Botão [Registrar Gasto]**: Abater do saldo do fornecedor após uma compra realizada.
    *   *Como usar*: Foi ao "Supermercado X" e comprou R$ 150,00 em lanches? Use este botão para dar baixa e manter o saldo atualizado.

### 2.4 Recursos (UE e Caixa Escolar)
**Função**: Controle de verbas vinculadas (FNDE/Repasses Estaduais).
*   **Botão [Nova Conta]**: Adicionar uma nova rubrica ou conta bancária específica.
    *   *Como usar*: Abriram uma nova conta para receber um recurso específico? Clique aqui e vincule-a à UE ou CX.
*   **Botão [Entrada de Recurso]**: Registrar a chegada de verba pública.
    *   *Como usar*: Caiu o repasse do PNAE (Merenda)? Selecione a conta de destino correta e registre o valor recebido do governo.
*   **Botão [Gasto de Recurso]**: Pagamento direto de notas fiscais usando verba vinculada ou aportar como saldo em estabelecimento.
    *   *Como usar*: Pagou a manutenção do ar condicionado com a conta FEE? Use este botão para registrar a saída direta da conta bancária vinculada.
    *   *Como usar*: Deseja aportar o saldo da conta FEE para o "Supermercado X"? Use este botão para registrar a saída direta da conta bancária vinculada.

### 2.5 Relatórios e Prestação de Contas
**Função**: Exportação e transparência.
*   **Selecione o período do relatório desejado.**
*   **Botão [Copiar Texto / Abrir WhatsApp]**: Gera o resumo formatado.
    *   *Como usar*: Use toda sexta-feira para enviar o resumo atualizado no grupo de oficiais. Você pode escolher incluir ou não os saldos da UE/CX no resumo.
*   **Botão [Exportar PDF]**: Gera o balancete oficial em PDF.
    *   *Como usar*: Selecione o período do mês fechado e exporte o PDF para arquivamento ou anexar à prestação de contas física.
*   **Filtros (Lupa/Funil)**: Buscar transações específicas.
    *   *Como usar*: Precisa achar quanto gastou com "Limpeza" no mês passado? Use a busca textual e o filtro de datas.

### 2.6 Anulação e Histórico
**Função**: Corrigir erros de lançamento de forma transparente.
*   **Botão [Anular]**: Localizado ao final de cada linha no "Histórico".
    *   *Como usar*: Lançou um valor errado na Mensalidade? Clique no botão X vermelho no histórico, insira a justificativa (Ex: "Valor digitado incorretamente") e confirme. O sistema reverte o saldo automaticamente.
*   **Logs de Auditoria**: Registro permanente de todas as ações.
    *   *Como usar*: Vá em Logs para conferir quem anulou um lançamento e qual foi a justificativa fornecida.

### 2.7 Gestão de Cadastros (Edição e Exclusão)
**Função**: Manter a lista de fornecedores e contas em dia.
*   **Botão [Lápis]**: Edita o nome de um estabelecimento ou número de conta.
    *   *Como usar*: O nome do mercado mudou? Clique no lápis ao lado do nome na aba Saldos e atualize.
    *   *Como usar*: O número da conta mudou? Clique no lápis ao lado do número na aba Saldos e atualize.
*   **Botão [Lixeira]**: Desativa um estabelecimento ou conta.
    *   *Como usar*: Um fornecedor não atende mais a escola? Clique na lixeira no card do estabelecimento para desativá-lo. Ele não aparecerá mais para novos lançamentos, mas seu histórico será preservado.
    *   *Como usar*: Uma conta não é mais utilizada? Clique na lixeira no card da conta para desativá-la. Ela não aparecerá mais para novos lançamentos, mas seu histórico será preservado.

### 2.8 Administração de Usuários (Apenas Admin)
**Função**: Controle de quem acessa o sistema.
*   **Ativação (Switch)**: Libera acesso para novos cadastros.
    *   *Como usar*: Um novo Tenente se cadastrou? Vá em Usuários e ative a chave (Switch) para que ele consiga logar.
*   **Alterar Função (Select)**: Muda permissões.
    *   *Como usar*: Precisa que um usuário vire admin? Altere a função dele para "Admin" na lista de usuários, ou quer mostrar o funcionamento do sistema sem mostrar os valores reais? Altere a função dele para "Demo / Visitante" na lista de usuários.

### 2.9 Perfil e Segurança
*   **Alterar Senha**: No menu Perfil, você pode definir uma nova senha informando a atual.
*   **Esqueci a Senha**: Na tela de login, clique em "Esqueci minha senha" para receber um link de redefinição no e-mail cadastrado.

---

## 3. Guia Operacional (Rotina)

Para uma gestão eficiente, siga este fluxo diário:

1.  **Conferência Inicial**: No início do turno, cheque o saldo em **Espécie** para garantir que o físico bate com o sistema.
2.  **Lançamentos de Entrada**: Registre mensalidades conforme entram na secretaria.
3.  **Autorização de Compras**: Antes de autorizar uma compra em mercado, verifique se o **Saldo do Estabelecimento** comporta o valor.
4.  **Fechamento**: No final do dia/semana, gere o **Relatório** do período e utilize o **Preview WhatsApp** para informar os demais sobre as movimentações.

---

## 4. Auditoria e Segurança

*   **Não há Edição**: Para evitar fraudes, valores não podem ser editados.
*   **Fluxo de Anulação**: Se errar, use o botão **Anular** no histórico. 
*   **Logs**: O sistema registra em **Logs** quem anulou, a data, o valor original e a justificativa obrigatória.

---
