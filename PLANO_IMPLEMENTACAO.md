# Plano de Implementação - 5 Fases

## Princípios Guia
1. **Não quebrar o existente**: Cada fase é aditiva, não substitui
2. **Melhores práticas UX/UI**: Consistência com design atual
3. **Testes em cada fase**: Garantir qualidade
4. **Checkpoints entre fases**: Validar antes de prosseguir

---

## FASE 1: MVP DAILY (Semana 1-2)

### Objetivo
Suportar reuniões diárias com visualização de bloqueadores, atrasos e resumo executivo.

### 1.1 Estrutura de Banco de Dados

**Novas Tabelas:**
```sql
-- Snapshots diários (para histórico)
CREATE TABLE daily_snapshots (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  total_sp INTEGER,
  completed_sp INTEGER,
  in_progress_sp INTEGER,
  blocked_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sprint_id, snapshot_date)
);

-- Bloqueadores/Impedimentos
CREATE TABLE impediments (
  id SERIAL PRIMARY KEY,
  issue_key VARCHAR(50) NOT NULL,
  issue_summary TEXT,
  blocked_since DATE NOT NULL,
  reason VARCHAR(255),
  impact_sp INTEGER,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Atividade recente
CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  issue_key VARCHAR(50) NOT NULL,
  from_status VARCHAR(100),
  to_status VARCHAR(100),
  changed_by VARCHAR(255),
  changed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Componentes UI (Daily)

**Nova página: `/pages/Daily.tsx`**
- Layout com 4 cards principais
- Responsivo (mobile-first)

**Cards:**
1. **Avisos de Atraso** (OverdueCard)
   - Issues com dataFim < hoje
   - Mostrar dias de atraso
   - Cor vermelha com badge
   - Clicável para abrir modal com detalhes

2. **Bloqueadores Ativos** (BlockersCard)
   - Issues bloqueadas
   - Dias bloqueado
   - Responsável
   - Motivo (se disponível)
   - Botão para resolver

3. **Atividade Recente (24h)** (ActivityCard)
   - Timeline de mudanças
   - Quem fez o quê
   - Hora da mudança
   - Filtro por tipo

4. **Resumo Daily** (DailySummaryCard)
   - Taxa de conclusão (24h)
   - Issues concluídas ontem
   - Issues em progresso
   - Botão "Gerar Resumo" (PDF/Share)

### 1.3 Endpoints tRPC

```typescript
// Daily metrics
trpc.daily.getOverdueIssues()
trpc.daily.getBlockers()
trpc.daily.getRecentActivity()
trpc.daily.getDailySummary()
trpc.daily.generateDailyReport()

// Impediments management
trpc.impediments.create()
trpc.impediments.update()
trpc.impediments.resolve()
trpc.impediments.list()
```

### 1.4 Integração com Jira

- Sincronizar bloqueadores automaticamente
- Detectar issues atrasadas
- Capturar atividade (updated field)

---

## FASE 2: REVIEW (Semana 2-3)

### Objetivo
Suportar reuniões de review com comparação de sprints, velocidade e distribuição de trabalho.

### 2.1 Estrutura de Banco de Dados

**Novas Tabelas:**
```sql
-- Histórico de sprints (para comparação)
CREATE TABLE sprint_history (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL,
  sprint_name VARCHAR(255),
  total_issues INTEGER,
  completed_issues INTEGER,
  total_sp INTEGER,
  completed_sp INTEGER,
  velocity DECIMAL(10, 2),
  completion_rate DECIMAL(5, 2),
  started_at DATE,
  ended_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Distribuição de trabalho
CREATE TABLE work_distribution (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL,
  assignee VARCHAR(255),
  total_issues INTEGER,
  completed_issues INTEGER,
  total_sp INTEGER,
  completed_sp INTEGER,
  completion_rate DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Componentes UI (Review)

**Nova página: `/pages/Review.tsx`**

**Cards:**
1. **Comparação de Sprints** (SprintComparisonCard)
   - Sprint atual vs anterior
   - Lado a lado: issues, SP, taxa
   - Gráfico de tendência

2. **Velocidade** (VelocityChart)
   - Gráfico de barras (últimas 5 sprints)
   - Mostrar média e projeção
   - Tendência (↑ ↓ →)

3. **Distribuição de Trabalho** (WorkDistributionCard)
   - Tabela com: nome, issues, SP, concluídas, taxa
   - Gráfico de pizza
   - Ordenar por SP

4. **Burndown Chart** (BurndownChart)
   - Eixo X: dias da sprint
   - Eixo Y: SP restantes
   - Linha ideal vs real
   - Status: adiantado/atrasado

### 2.3 Endpoints tRPC

```typescript
trpc.review.getSprintComparison()
trpc.review.getVelocityTrend()
trpc.review.getWorkDistribution()
trpc.review.getBurndown()
trpc.review.getSprintHistory()
```

---

## FASE 3: RETROSPECTIVA (Semana 3-4)

### Objetivo
Suportar reuniões de retrospectiva com rastreamento de ações, qualidade e padrões.

### 3.1 Estrutura de Banco de Dados

**Novas Tabelas:**
```sql
-- Ações de retrospectiva
CREATE TABLE retro_actions (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  owner VARCHAR(255),
  target_sprint INTEGER,
  status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed
  result TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Métricas de qualidade
CREATE TABLE quality_metrics (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL,
  total_bugs INTEGER,
  bugs_found_in_qa INTEGER,
  bugs_found_in_prod INTEGER,
  rework_issues INTEGER,
  rework_percentage DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Padrões de bloqueio
CREATE TABLE blocking_patterns (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL,
  blocker_type VARCHAR(100), -- dependency, info, resource, other
  count INTEGER,
  impact_sp INTEGER,
  avg_duration_days DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Componentes UI (Retrospectiva)

**Nova página: `/pages/Retrospective.tsx`**

**Cards:**
1. **Ações da Retro Anterior** (RetroActionsTable)
   - Tabela: ação, responsável, sprint alvo, status
   - Badges: não iniciada, em progresso, concluída
   - Botão para editar/marcar como concluída

2. **Métricas de Qualidade** (QualityMetricsCard)
   - Bugs encontrados (QA vs Prod)
   - Taxa de retrabalho
   - Gráfico de tendência
   - Recomendações

3. **Análise de Bloqueadores** (BlockingPatternsCard)
   - Bloqueadores por tipo
   - Impacto em SP
   - Tempo médio bloqueado
   - Recomendações

4. **Criar Nova Ação** (CreateRetroActionForm)
   - Form simples: ação, responsável, sprint alvo
   - Botão "Adicionar Ação"

### 3.3 Endpoints tRPC

```typescript
trpc.retro.getActions()
trpc.retro.createAction()
trpc.retro.updateAction()
trpc.retro.getQualityMetrics()
trpc.retro.getBlockingPatterns()
trpc.retro.getRetroSummary()
```

---

## FASE 4: KPI DASHBOARD (Semana 4-5)

### Objetivo
Dashboard executivo com KPIs, alertas e tendências para gestão.

### 4.1 Estrutura de Banco de Dados

**Novas Tabelas:**
```sql
-- KPI histórico
CREATE TABLE kpi_history (
  id SERIAL PRIMARY KEY,
  kpi_name VARCHAR(100), -- velocity, cycle_time, lead_time, etc
  kpi_value DECIMAL(10, 2),
  kpi_target DECIMAL(10, 2),
  kpi_status VARCHAR(50), -- on_track, at_risk, off_track
  sprint_id INTEGER,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alertas
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100), -- overdue, low_velocity, high_bugs, etc
  severity VARCHAR(50), -- low, medium, high
  message TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);
```

### 4.2 Componentes UI (KPI)

**Nova página: `/pages/KPI.tsx`**

**Cards:**
1. **Velocity** (KPICard)
   - Métrica: SP entregues/sprint
   - Gauge: atual vs meta
   - Tendência: ↑ ↓ →
   - Status: on_track, at_risk, off_track

2. **Cycle Time** (KPICard)
   - Métrica: dias médios de ciclo
   - Gauge: atual vs meta
   - Histograma de distribuição

3. **Lead Time** (KPICard)
   - Métrica: dias da criação à conclusão
   - Gauge: atual vs meta
   - Gráfico de tendência

4. **Completion Rate** (KPICard)
   - Métrica: % de conclusão
   - Gauge: atual vs meta (80%)
   - Histórico

5. **Bug Escape Rate** (KPICard)
   - Métrica: bugs em produção / total
   - Gauge: atual vs meta (< 5%)
   - Tendência

6. **Team Capacity** (KPICard)
   - Métrica: SP por membro
   - Distribuição equilibrada?
   - Gráfico de barras

7. **Alertas** (AlertsPanel)
   - Lista de alertas ativos
   - Ícone de severidade
   - Botão para resolver

### 4.3 Endpoints tRPC

```typescript
trpc.kpi.getMetrics()
trpc.kpi.getMetricTrend()
trpc.kpi.getAlerts()
trpc.kpi.resolveAlert()
trpc.kpi.getKPISummary()
```

---

## FASE 5: COMERCIALIZAÇÃO (Semana 5+)

### Objetivo
Suportar múltiplas organizações, planos e billing.

### 5.1 Estrutura de Banco de Dados

**Novas Tabelas:**
```sql
-- Organizações
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  max_projects INTEGER DEFAULT 1,
  max_users INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Membros da organização
CREATE TABLE organization_members (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, user_id)
);

-- Subscrições
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  plan VARCHAR(50) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- active, canceled, past_due
  current_period_start DATE,
  current_period_end DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projetos Jira por organização
CREATE TABLE organization_projects (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  jira_project_key VARCHAR(50) NOT NULL,
  jira_project_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, jira_project_key)
);
```

### 5.2 Componentes UI (Comercialização)

**Nova página: `/pages/Settings/Organization.tsx`**
- Gerenciar organização
- Adicionar membros
- Plano atual
- Botão "Upgrade"

**Nova página: `/pages/Settings/Billing.tsx`**
- Histórico de faturas
- Método de pagamento
- Cancelar subscrição

**Nova página: `/pages/Settings/Projects.tsx`**
- Adicionar projetos Jira
- Remover projetos
- Sincronização

### 5.3 Endpoints tRPC

```typescript
trpc.organization.create()
trpc.organization.get()
trpc.organization.update()
trpc.organization.addMember()
trpc.organization.removeMember()
trpc.organization.addProject()
trpc.organization.removeProject()

trpc.billing.getPlans()
trpc.billing.upgrade()
trpc.billing.cancel()
trpc.billing.getInvoices()
```

---

## Estratégia de Implementação

### Por Fase

1. **Criar schema (migrations)**
2. **Criar endpoints tRPC** (com testes)
3. **Criar componentes UI** (com stories)
4. **Integrar no layout** (sem quebrar existente)
5. **Testar e validar**
6. **Checkpoint**

### Padrões de UX/UI

- **Cores**: Usar paleta existente
- **Tipografia**: Manter consistência
- **Spacing**: Usar grid de 4px
- **Componentes**: Reutilizar shadcn/ui
- **Responsividade**: Mobile-first

### Testes

- **Unit**: Cada endpoint tRPC
- **Integration**: Fluxos completos
- **Visual**: Snapshots de componentes
- **E2E**: Workflows principais

---

## Checklist de Validação

### Após cada fase:
- [ ] Todos os testes passando
- [ ] Sem quebra de funcionalidades existentes
- [ ] Performance OK (< 2s de carregamento)
- [ ] Responsivo em mobile
- [ ] Acessibilidade OK (WCAG AA)
- [ ] Checkpoint criado

---

## Estimativa de Esforço

| Fase | Backend | Frontend | Testes | Total |
|------|---------|----------|--------|-------|
| 1 | 4h | 6h | 2h | 12h |
| 2 | 3h | 5h | 2h | 10h |
| 3 | 2h | 4h | 1h | 7h |
| 4 | 2h | 6h | 2h | 10h |
| 5 | 5h | 4h | 2h | 11h |
| **Total** | **16h** | **25h** | **9h** | **50h** |

---

## Próximos Passos

1. Iniciar Fase 1: MVP Daily
2. Criar migrations do banco
3. Implementar endpoints
4. Criar componentes
5. Testar e validar
6. Checkpoint
7. Prosseguir para Fase 2
