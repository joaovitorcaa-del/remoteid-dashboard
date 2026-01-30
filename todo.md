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
