# Project TODO

## Dashboard Page
- [x] Implementar layout de dashboard com cards de métricas
- [x] Integrar dados de issues do Jira
- [x] Adicionar gráficos de distribuição de issues
- [x] Implementar filtros por tipo de issue
- [x] Adicionar modal de insights de IA

## Planning Page - Gráfico Gantt
- [x] Implementar gráfico Gantt com barras de issues
- [x] Adicionar drag & drop para mover issues
- [x] Corrigir cálculo de largura de barras (SP 2-3 = 50%)
- [x] Remover função de resize de barras
- [x] Adicionar linha do dia atual em laranja

## Planning Page - Reorganização de Layout
- [x] Mover Gráfico Gantt para o topo após salvar Sprint
- [x] Renomear título do Gantt para "Nome da Sprint-Ativa"
- [x] Adicionar linha vertical do dia atual (laranja) no Gráfico Gantt
- [x] Testar reorganização e validar posicionamento

## Planning Page - Mantenção de Formulário e Histórico
- [x] Manter formulário de nova Sprint visível após salvar
- [x] Implementar componente de histórico de Sprints
- [x] Adicionar funcionalidade de deletar Sprint
- [x] Adicionar funcionalidade de reativar Sprint
- [x] Testar fluxo completo de CRUD
- [x] Corrigir formatação de datas no histórico

## Planning Page - Refatoração do Histórico
- [x] Converter histórico em accordion expansível
- [x] Implementar seletor de Sprints anteriores
- [x] Visualizar Gantt da Sprint selecionada
- [x] Remover listagem grande de Sprints

## Planning Page - Correções de Visualização
- [x] Adicionar coluna de status (ativo/encerrado) no schema
- [x] Corrigir Planning.tsx para exibir Sprint ativa no topo após salvar
- [x] Carregar Gantt da Sprint ativa automaticamente
- [x] Adicionar mensagem "Sem Sprint Ativa" quando não houver Sprint ativa
- [x] Testar fluxo completo de salvamento e visualização

### Planning Page - Correção de Lógica de Sprint Ativa
- [x] Marcar Sprint como ativo (ativo: 1) ao salvar no banco
- [x] Exibir Sprint ativa no topo sempre que houver uma criada
- [x] Mostrar "Sem Sprint Ativa" apenas quando não houver nenhuma Sprint criada
- [x] Testar fluxo completo de salvamento e visualizaçãoento e visualiza\u00e7\u00e3o

### Planning Page - Correções Críticas
- [x] Debugar banco de dados - verificar dados em sprintIssues
- [x] Corrigir salvamento de Sprint - criar registros em sprintIssues com dataInicio e dataFim
- [x] Corrigir query de carregamento - trazer issues com datas corretas
- [x] Corrigir renderização do Gantt - exibir datas, colunas e barras de progresso
- [x] Testar fluxo completo de salvamento e visualizaçãoalvamento e visualiza\u00e7\u00e3o

## Planning Page - Reorganização de Layout e UX (Iteração 2)
- [x] Corrigir conversão de Date objects para strings YYYY-MM-DD no GanttChart
- [x] Mover dropdown de Sprint anterior para fora do quadro verde
- [x] Remover botão "Reativar Sprint"
- [x] Remover lista de issues do formulário de planejamento
- [x] Testar renderização completa com Sprint ativa e anterior


## Planning Page - Novas Funcionalidades (Iteração 3)
- [x] Adicionar botão de voltar para Dashboard no cabeçalho
- [x] Implementar validação de conflitos de issues por responsável
- [x] Implementar legenda de cores para barras de progresso baseado em Status + dataFim
- [x] Destacar coluna do dia atual com fundo cinza claro
- [x] Testar todas as funcionalidades e salvar checkpoint

## Sincronização com Jira - Correções
- [x] Investigar por que o botão "Sync com Jira" não estava atualizando status
- [x] Remover logs de debug da função syncActiveSprintIssues
- [x] Validar que o sync está funcionando corretamente
- [x] Confirmar que todos os 32 testes continuam passando

## Sincronização com Jira - Implementação Funcional
- [x] Investigar por que o sync não estava atualizando os status das issues
- [x] Verificar credenciais Jira (JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY)
- [x] Debugar fetchJiraActiveSprintIssues para confirmar que retorna dados
- [x] Corrigir mapeamento de status do Jira para Dashboard (CODE DOING, CODE REVIEW, etc)
- [x] Adicionar logging detalhado para debug da sincronização
- [x] Validar que todos os status são atualizados corretamente

## Correção de Cards do Dashboard
- [x] Corrigir contagem do card "Ready to Sprint/Dev To Do" para somar ambos status
- [x] Corrigir contagem do card "Em Desenvolvimento/Code Review" para apenas esses dois status
- [x] Adicionar modal para exibir issues no card "Ready to Sprint/Dev To Do"
- [x] Adicionar modal para exibir issues no card "Em Desenvolvimento/Code Review"
- [x] Corrigir comparação de status para case-insensitive (READY TO SPRINT vs Ready to Sprint)
- [x] Adicionar readyToSprintCount ao DashboardContext
- [x] Testar e validar as correções

## Correção do Modal Ready to Sprint/Dev To Do
- [x] Investigar por que o modal não estava listando issues com status Ready to Sprint
- [x] Corrigir o filtro de readyToSprintIssues para usar case-insensitive
- [x] Testar e validar o modal

## Modal para Taxa de Conclusão (Done Issues)
- [x] Investigar o código do card Taxa de Conclusão
- [x] Adicionar estado para o modal de Done Issues
- [x] Criar o filtro de doneIssues com status "Done"
- [x] Adicionar onClick ao card Taxa de Conclusão
- [x] Criar o modal para exibir Done Issues
- [x] Testar e validar

## Backlog do Jira com JQL
- [x] Criar função para buscar Backlog do Jira usando JQL
- [x] Adicionar estado e efeito para carregar Backlog do Jira
- [x] Ajustar tamanho do card Backlog para ter mesma altura do card Distribuição por Tipo
- [x] Adicionar barra de rolagem para muitos itens
- [x] Testar e validar

## Ajuste do Card Backlog
- [x] Exibir apenas os 3 primeiros issues no card
- [x] Adicionar botão "Ver mais itens"
- [x] Abrir modal ao clicar no botão
- [x] Manter cálculo do total
- [x] Testar e validar
