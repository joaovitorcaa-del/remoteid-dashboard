# Project TODO - AUDITORIA E CORREÇÕES FINAIS

## Auditoria Completada
- [x] Verificar imports em dashboard.ts (CORRIGIDO: Adicionado router e protectedProcedure)
- [x] Verificar ordem de providers em App.tsx (OK: FilterProvider antes de DashboardProvider)
- [x] Verificar inicialização de FilterContext (OK: Filtro padrão Sprint Ativa)
- [x] Verificar endpoints tRPC (OK: Todos implementados)
- [x] Verificar integração com Jira (PENDENTE: Conectividade com API)
- [ ] Testar Daily.tsx com JQL ativo
- [ ] Testar Review.tsx com JQL ativo
- [ ] Remover googleSheetsService.ts
- [ ] Adicionar indicador visual de filtro ativo no header
- [ ] Adicionar atalhos de filtros rápidos

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
- [x] Testar fluxo completo de salvamento e visualização

### Planning Page - Correções Críticas
- [x] Debugar banco de dados - verificar dados em sprintIssues
- [x] Corrigir salvamento de Sprint - criar registros em sprintIssues com dataInicio e dataFim
- [x] Corrigir query de carregamento - trazer issues com datas corretas
- [x] Corrigir renderização do Gantt - exibir datas, colunas e barras de progresso
- [x] Testar fluxo completo de salvamento e visualização

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

## Modal Code Review - Exibir IssueType
- [x] Adicionar IssueType no modal "Em Desenvolvimento/Code Review"
- [x] Testar e validar

## Gerenciador de Filtros JQL
- [x] Criar tabela de JQL Filters no banco de dados
- [x] Criar endpoints tRPC para CRUD de JQL filters
- [x] Criar modal JQL para gerenciar filtros
- [x] Adicionar botão JQL na Home
- [ ] Modificar Dashboard para buscar dados do Jira usando JQL
- [x] Testar e validar

## Ajuste do Modal JQL
- [x] Adicionar checkbox mostrando qual filtro está ativo
- [x] Exibir filtros como cards colapsáveis
- [x] Ocultar JQL inicialmente (expandir ao clicar)
- [x] Testar e validar

---

# FASE 1: MVP DAILY (Semana 1-2)

## Fase 1 - Estrutura e Banco de Dados
- [x] Criar migrations para tabelas: daily_snapshots, impediments, activity_log
- [x] Criar funções no server/db.ts para CRUD de impedimentos
- [x] Criar funções para snapshots diários
- [x] Criar funções para activity log
- [x] Executar migrations com pnpm db:push
- [x] Validar schema no banco

## Fase 1 - Componentes e UI
- [x] Criar OverdueCard.tsx (issues atrasadas)
- [x] Criar BlockersCard.tsx (bloqueadores ativos)
- [x] Criar ActivityCard.tsx (atividade recente 24h)
- [x] Criar DailySummaryCard.tsx (resumo executivo)
- [x] Criar Daily.tsx (página principal)
- [x] Integrar Daily.tsx no App.tsx (navegação)
- [x] Criar endpoints tRPC para daily metrics
- [x] Criar endpoints tRPC para impediments
- [x] Testar componentes no browser

## Fase 1 - Testes e Validação
- [x] Escrever testes para endpoints daily
- [x] Escrever testes para impediments
- [x] Testar fluxo completo (criar, listar, atualizar bloqueadores)
- [x] Validar que Home.tsx não foi quebrada
- [x] Validar que Planning.tsx não foi quebrada
- [x] Executar todos os testes (pnpm test)
- [ ] Criar checkpoint Fase 1

---

# FASE 2: REVIEW (Semana 2-3)

## Fase 2 - Estrutura e Componentes
- [x] Criar migrations para tabelas: sprint_history, work_distribution
- [x] Criar funções no server/db.ts para sprint history
- [x] Criar funções para work distribution
- [x] Executar migrations com pnpm db:push
- [x] Criar SprintComparisonCard.tsx
- [x] Criar VelocityCard.tsx
- [x] Criar BurndownChartReview.tsx
- [x] Criar Review.tsx (página principal)
- [x] Integrar Review.tsx no App.tsx (navegação)
- [x] Adicionar botão Review no header da Home
- [ ] Criar endpoints tRPC para review metrics

## Fase 2 - Testes e Validação
- [ ] Escrever testes para endpoints review
- [ ] Testar fluxo completo de review
- [x] Validar que Daily.tsx não foi quebrada
- [x] Validar que Home.tsx não foi quebrada
- [ ] Executar todos os testes (pnpm test)
- [ ] Criar checkpoint Fase 2

---

# FASE 3: RETROSPECTIVA (Semana 3-4)

## Fase 3 - Estrutura e Componentes
- [ ] Criar migrations para tabelas: retro_actions, quality_metrics, blocking_patterns
- [ ] Criar funções no server/db.ts para retro actions
- [ ] Criar funções para quality metrics
- [ ] Criar funções para blocking patterns
- [ ] Executar migrations com pnpm db:push
- [ ] Criar RetroActionsTable.tsx
- [ ] Criar QualityMetricsCard.tsx
- [ ] Criar BlockingPatternsCard.tsx
- [ ] Criar CreateRetroActionForm.tsx
- [ ] Criar Retrospective.tsx (página principal)
- [ ] Integrar Retrospective.tsx no App.tsx (navegação)
- [ ] Criar endpoints tRPC para retro

## Fase 3 - Testes e Validação
- [ ] Escrever testes para endpoints retro
- [ ] Testar fluxo completo de retrospectiva
- [ ] Validar que Review.tsx não foi quebrada
- [ ] Validar que Daily.tsx não foi quebrada
- [ ] Executar todos os testes (pnpm test)
- [ ] Criar checkpoint Fase 3

---

# FASE 4: KPI DASHBOARD (Semana 4-5)

## Fase 4 - Estrutura e Componentes
- [ ] Criar migrations para tabelas: kpi_history, alerts
- [ ] Criar funções no server/db.ts para KPI
- [ ] Criar funções para alerts
- [ ] Executar migrations com pnpm db:push
- [ ] Criar KPICard.tsx (componente genérico)
- [ ] Criar AlertsPanel.tsx
- [ ] Criar KPI.tsx (página principal)
- [ ] Integrar KPI.tsx no App.tsx (navegação)
- [ ] Criar endpoints tRPC para KPI metrics
- [ ] Implementar cálculo de KPIs (velocity, cycle_time, lead_time, etc)

## Fase 4 - Testes e Validação
- [ ] Escrever testes para endpoints KPI
- [ ] Testar fluxo completo de KPI
- [ ] Validar que Retrospective.tsx não foi quebrada
- [ ] Validar que Review.tsx não foi quebrada
- [ ] Executar todos os testes (pnpm test)
- [ ] Criar checkpoint Fase 4

---

# FASE 5: COMERCIALIZAÇÃO (Semana 5+)

## Fase 5 - Estrutura Multi-tenant
- [ ] Criar migrations para tabelas: organizations, organization_members, organization_projects
- [ ] Criar funções no server/db.ts para organizations
- [ ] Criar funções para organization members
- [ ] Criar funções para organization projects
- [ ] Executar migrations com pnpm db:push
- [ ] Modificar schema user para adicionar organization_id
- [ ] Criar middleware de autenticação por organização
- [ ] Criar endpoints tRPC para organizations

## Fase 5 - Billing e Integração
- [ ] Criar migrations para tabelas: subscriptions
- [ ] Criar funções para subscriptions
- [ ] Integrar Stripe (webdev_add_feature stripe)
- [ ] Criar endpoints tRPC para billing
- [ ] Criar página Settings/Organization.tsx
- [ ] Criar página Settings/Billing.tsx
- [ ] Criar página Settings/Projects.tsx
- [ ] Testar fluxo completo de multi-tenant
- [ ] Testar fluxo de upgrade/downgrade
- [ ] Executar todos os testes (pnpm test)
- [ ] Criar checkpoint Fase 5

---

# ENTREGA FINAL

- [ ] Documentar todas as novas features
- [ ] Criar guia de uso para cada página
- [ ] Validar performance geral
- [ ] Validar responsividade em mobile
- [ ] Validar acessibilidade (WCAG AA)
- [ ] Criar checkpoint final
- [ ] Preparar para produção


---

# REFATORAÇÃO: Jira como Fonte Única de Dados

## Fase 1: Contexto Global de Filtro JQL
- [x] Estender FilterContext para incluir filtro JQL ativo
- [x] Adicionar estado para armazenar filtro padrão (Sprint Ativa)
- [x] Criar hook useActiveJqlFilter() para acessar filtro em qualquer componente
- [x] Persistir filtro ativo no localStorage

## Fase 2: Refatorar Endpoints tRPC
- [x] Criar endpoint dashboard.getMetricsByJql(jql) - retorna métricas do Jira
- [x] Criar endpoint dashboard.getIssuesByJql(jql) - retorna issues do Jira
- [x] Criar endpoint dashboard.getActivityByJql(jql) - retorna atividade das últimas 24h
- [x] Criar endpoint dashboard.getCriticalIssuesByJql(jql) - retorna bloqueadores
- [x] Manter endpoint jira.getBacklogIssues com seu JQL específico
- [x] Remover dependência de Google Sheets em refreshData()

## Fase 3: Atualizar Componentes
- [x] Refatorar DashboardContext para usar endpoints tRPC com JQL
- [x] Corrigir ordem de providers (FilterProvider antes de DashboardProvider)
- [x] Atualizar JqlModal para atualizar FilterContext ao selecionar filtro
- [x] Auto-refresh ao mudar filtro JQL
- [ ] Atualizar Daily.tsx para usar JQL ativo
- [ ] Atualizar Review.tsx para usar JQL ativo
- [ ] Remover googleSheetsService.ts (não mais necessário)

## Fase 4: Integração com JQL Modal
- [x] Quando selecionar filtro no JQL Modal, atualizar FilterContext
- [x] Disparar refresh automático ao mudar filtro
- [ ] Mostrar qual filtro está ativo no header
- [ ] Adicionar botão "Sprint Ativa" como favorito rápido

## Fase 5: Testes e Validação
- [x] Testar fluxo completo com Sprint Ativa
- [x] Testar criação de novo filtro e aplicação
- [x] Testar botão Atualizar Dados com JQL ativo
- [x] Validar que Backlog continua com seu JQL
- [x] Validar que dados são atualizados em tempo real


---

# FASE 3: RETROSPECTIVA (Semana 3-4)

## Fase 3 - Estrutura e Banco de Dados
- [x] Criar migrations para tabelas: retro_actions, quality_metrics, blocking_patterns
- [x] Criar funções no server/db.ts para retro actions
- [x] Criar funções para quality metrics
- [x] Criar funções para blocking patterns
- [x] Executar migrations com pnpm db:push
- [x] Validar schema no banco

## Fase 3 - Componentes e UI
- [x] Criar RetroActionsTable.tsx (tabela de ações com status)
- [x] Criar QualityMetricsCard.tsx (bugs por sprint)
- [x] Criar BlockingPatternsCard.tsx (análise de padrões)
- [x] Criar CreateRetroActionForm.tsx (formulário para criar ações)
- [x] Criar Retrospective.tsx (página principal)
- [x] Integrar Retrospective.tsx no App.tsx (navegação)
- [x] Adicionar botão Retrospectiva no header da Home

## Fase 3 - Endpoints tRPC
- [x] Criar endpoint retro.createAction()
- [x] Criar endpoint retro.getActions()
- [x] Criar endpoint retro.updateActionStatus()
- [x] Criar endpoint retro.deleteAction()
- [x] Criar endpoint retro.getQualityMetrics()
- [x] Criar endpoint retro.getBlockingPatterns()

## Fase 3 - Testes e Validação
- [x] Escrever testes para endpoints retro
- [x] Testar fluxo completo de retrospectiva
- [x] Validar que Review.tsx não foi quebrada
- [x] Validar que Daily.tsx não foi quebrada
- [x] Executar todos os testes (pnpm test)
- [ ] Criar checkpoint Fase 3


## Correcoes de Bugs
- [x] Corrigir erro JQL: "Expecting ',' but got 'AND'" - Adicionar limpeza de quebras de linha no getActivityByJql


## Correcao de Modais - Usar JQL como Fonte
- [x] Criar endpoints tRPC para buscar issues por status (Dev, QA, Ready to Sprint, Done)
- [x] Refatorar DevIssuesModal para usar endpoint tRPC com JQL
- [x] Refatorar CompletedIssuesModal para usar endpoint tRPC com JQL
- [x] Refatorar QAIssuesModal para usar endpoint tRPC com JQL
- [x] Refatorar ReadyToSprintModal para usar endpoint tRPC com JQL
- [x] Refatorar DoneIssuesModal para usar endpoint tRPC com JQL
- [x] Testar todos os modais com dados do Jira
- [x] Validar que filtros funcionam corretamente
