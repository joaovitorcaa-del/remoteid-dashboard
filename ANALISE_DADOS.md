# Análise Comparativa: CSV vs API

## Dados do CSV (JIRA(9).csv)

**Total de linhas:** 13.159
**Issues válidas:** 816 (com Issue Key preenchido)

### Distribuição por Issue Type:
- Codification Task: 296
- Bug: 138
- New Feature: 97
- Story: 85
- Improvement: 67
- Epic: 34
- Task: 27
- Tests: 18
- Test: 12
- UX: 10
- Integração: 8
- Análise: 7
- Documentação: 4
- Segurança da Informação: 3
- Desenvolvimento de análise: 3
- Homologation Task: 2
- Technical Task: 1
- Tarefa de Produto: 1
- Relatórios: 1
- Estudo: 1
- Build&Deploy: 1

### Distribuição por Status:
- DONE: 630
- OPENED: 55
- Canceled: 40
- READY TO SPRINT: 24
- STAGING: 18
- USER STORY REFINEMENT: 17
- CODE DOING: 9
- CODE REVIEW: 8
- Test To Do: 7
- Prioritized: 4
- Dev To Do: 3
- USER STORY WRITTEN: 1

## JQL Usado:
```
project IN ("RemoteID", "DesktopID", "Mobile ID") AND created >= "2025-07-01" ORDER BY priority DESC
```

## Problema Identificado:
O CSV exportado do Jira tem um problema de formatação onde muitas linhas contêm descrições/comentários que quebram a estrutura CSV, resultando em 13.159 linhas mas apenas 816 issues válidas.

## Próximas Ações:
1. Validar se a API está retornando os 816 issues corretos
2. Comparar distribuição de tipos e status entre CSV e API
3. Verificar se há filtros adicionais sendo aplicados na API que não estão no JQL
