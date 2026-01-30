# RemoteID Dashboard - TODO

## Reordenação do Sumário Executivo
- [x] Reorganizar cards seguindo fluxo lógico: Distribuição → Taxa de Conclusão → Dev/Code Review → QA → Progresso 24h
- [x] Primeira linha: Distribuição de Issues + Taxa de Conclusão
- [x] Segunda linha: Em Desenvolvimento/Code Review + Etapa QA + Progresso (24h)
- [x] Manter gráfico de disco com segmentação por issue type
- [x] Substituir Burn Down Chart pelo Backlog Card
- [x] Criar modal para listagem de itens do backlog com barra de rolagem

## Funcionalidades Existentes
- [x] Dashboard com métricas principais
- [x] Insight de IA
- [x] Atualizar Dados
- [x] Filtro por tipo de issue
- [x] Modais de issues (Dev Issues, Completed Issues)

## Modais e Melhorias de UX
- [x] Adicionar modal ao card "Etapa QA" com listagem de itens (similar ao Dev/Code Review)
- [x] Adicionar modal ao card "Backlog" com listagem de itens (similar ao Dev/Code Review)
- [x] Remover card de Backlog duplicado (abaixo do gráfico "Distribuição e Backlog")
- [x] Reordenar status do gráfico: opened, ready to sprint, Dev to Do, Code Doing, Code Review, Test to Do, Test Doing, Staging, Done

## Bugs Reportados
- [x] Insight de IA está dando erro ao clicar no botão (Corrigido: import de useState adicionado)

## Integração com LLM
- [x] Criar rota tRPC para chamar o LLM com prompt estruturado
- [x] Atualizar AIInsightModal para usar a rota tRPC
- [x] Testar geração de insights com modelo de linguagem real (10/10 testes passando)
- [x] Adicionar tratamento de erros e fallback para insights simulados

## Renomeação do Dashboard
- [x] Ajustar nome do Dashboard para "App Certisign Dashboard"
- [x] Atualizar título em Home.tsx
- [x] Atualizar nome do projeto em package.json
- [x] Atualizar descrição em index.html

## Planning Page - Correções Imediatas
- [x] SP 2-3 deve ocupar 50% da coluna (não 100%)
- [x] Drag & drop inconsistente - debugar handlers de mouse
- [x] Remover função de resize (remover resize handle)

## Planning Page - Reorganização de Layout
- [x] Mover Gráfico Gantt para o topo após salvar Sprint
- [x] Renomear título do Gantt para "Nome da Sprint-Ativa"
- [x] Adicionar linha vertical do dia atual (laranja) no Gráfico Gantt
- [x] Testar reorganização e validar posicionamento

## Corre\u00e7\u00e3o de Erros## Correção de Erros de Validação
- [x] Corrigir Planning.tsx para enviar dados completos das issues
- [x] Corrigir server/routers.ts para aceitar payload correto
- [x] Validar que sprintId é obtido corretamente após criar Sprint
- [x] Testar salvamento completo de Sprint com issues

## Planning Page - Manutenção de Formulário e Histórico
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
