import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SprintIssue {
  id: number;
  chave: string;
  resumo: string;
  storyPoints: number;
  dataInicio: string;
  dataFim: string;
  responsavel: string;
  status: string;
}

interface GanttChartProps {
  issues: SprintIssue[];
  sprintStart: string;
  sprintEnd: string;
}

const storyPointsToDays = (sp: number): number => {
  if (sp <= 3) return 0.5;
  if (sp <= 5) return 1;
  if (sp <= 8) return 2;
  if (sp <= 13) return 3;
  return Math.ceil(sp / 5);
};

// Calcula data de fim baseado em dias úteis
// LÓGICA CORRIGIDA:
// - Se days < 1 (ex: 0.5): termina no MESMO DIA
// - Se days >= 1: conta dias úteis começando do dia de início
const calculateEndDate = (startDate: string, days: number): string => {
  // Se é menos de 1 dia (ex: 0.5), termina no mesmo dia
  if (days < 1) {
    return startDate;
  }
  
  const start = new Date(startDate + 'T00:00:00Z');
  let current = new Date(start);
  let daysAdded = 0;
  
  // Contar dias úteis começando do dia de início
  while (daysAdded < days) {
    const dayOfWeek = current.getUTCDay();
    // Se é dia útil (seg-sex)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
      // Se chegamos no último dia, retorna
      if (daysAdded === days) {
        return current.toISOString().split('T')[0];
      }
    }
    // Avança para o próximo dia
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return current.toISOString().split('T')[0];
};

// Gera array de datas úteis (seg-sex)
const generateSprintDates = (sprintStart: string, sprintEnd: string): string[] => {
  const dates: string[] = [];
  const current = new Date(sprintStart + 'T00:00:00Z');
  const end = new Date(sprintEnd + 'T00:00:00Z');

  while (current <= end) {
    const dayOfWeek = current.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(current.toISOString().split('T')[0]);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

// Detecta conflitos: mesmo responsável com períodos sobrepostos
const detectConflicts = (issues: SprintIssue[]): Set<number> => {
  const conflicts = new Set<number>();
  
  for (let i = 0; i < issues.length; i++) {
    for (let j = i + 1; j < issues.length; j++) {
      const issue1 = issues[i];
      const issue2 = issues[j];
      
      // Mesmo responsável?
      if (issue1.responsavel !== issue2.responsavel) continue;
      
      // Períodos se sobrepõem?
      // Conflito se: fim1 >= início2 E fim2 >= início1
      if (issue1.dataFim >= issue2.dataInicio && issue2.dataFim >= issue1.dataInicio) {
        conflicts.add(issue1.id);
        conflicts.add(issue2.id);
      }
    }
  }
  
  return conflicts;
};

// Retorna cor baseada no status
const getBarColorByStatus = (status: string): string => {
  switch (status) {
    case 'Ready to Sprint':
    case 'Dev to Do':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'Code Doing':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'Code Review':
      return 'bg-orange-500 hover:bg-orange-600';
    case 'Test to Do':
    case 'Test Doing':
      return 'bg-purple-500 hover:bg-purple-600';
    case 'Staging':
      return 'bg-cyan-500 hover:bg-cyan-600';
    case 'Done':
      return 'bg-green-500 hover:bg-green-600';
    case 'Cancelled':
      return 'bg-gray-400 hover:bg-gray-500';
    default:
      return 'bg-gray-400 hover:bg-gray-500';
  }
};

// Retorna indicador visual de conflito
const getConflictIndicator = (hasConflict: boolean): string => {
  return hasConflict ? 'border-2 border-red-500 shadow-lg shadow-red-500/50' : '';
};

export function GanttChart({ issues, sprintStart, sprintEnd }: GanttChartProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const dates = useMemo(() => generateSprintDates(sprintStart, sprintEnd), [sprintStart, sprintEnd]);
  const conflicts = useMemo(() => detectConflicts(issues), [issues]);

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('gantt-scroll-container');
    if (container) {
      const scrollAmount = 200;
      container.scrollLeft += direction === 'right' ? scrollAmount : -scrollAmount;
    }
  };

  return (
    <div className="w-full">
      {/* Legenda de Cores */}
      <Card className="p-4 mb-4">
        <h3 className="font-semibold mb-3">Legenda de Cores</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div key="legend-ready" className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">Ready/Dev To Do</span>
          </div>
          <div key="legend-code-doing" className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Code Doing</span>
          </div>
          <div key="legend-code-review" className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm">Code Review</span>
          </div>
          <div key="legend-test" className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm">Test/Staging</span>
          </div>
          <div key="legend-done" className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Done</span>
          </div>
          <div key="legend-conflict" className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-red-500 rounded"></div>
            <span className="text-sm">Conflito (borda)</span>
          </div>
        </div>
      </Card>

      {/* Gantt Chart */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleScroll('left')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleScroll('right')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div
          id="gantt-scroll-container"
          className="overflow-x-auto border rounded-lg"
        >
          <div className="min-w-max">
            {/* Header com datas */}
            <div className="flex border-b bg-gray-50">
              <div className="w-40 flex-shrink-0 border-r p-2 font-semibold">
                Issue
              </div>
              {dates.map((date) => (
                <div
                  key={date}
                  className="w-16 flex-shrink-0 border-r p-2 text-center text-xs font-semibold"
                >
                  {new Date(date + 'T00:00:00Z').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </div>
              ))}
            </div>

            {/* Linhas de issues */}
            {issues.map((issue) => {
              const startIndex = dates.indexOf(issue.dataInicio);
              const endIndex = dates.indexOf(issue.dataFim);
              const hasConflict = conflicts.has(issue.id);

              return (
                <div key={issue.id} className="flex border-b hover:bg-gray-50">
                  {/* Coluna de informações */}
                  <div className="w-40 flex-shrink-0 border-r p-2 text-sm">
                    <div className="font-semibold">{issue.chave}</div>
                    <div className="text-xs text-gray-600 truncate">
                      {issue.resumo}
                    </div>
                    <div className="text-xs text-gray-500">
                      {issue.responsavel}
                    </div>
                  </div>

                  {/* Colunas de datas com barras */}
                  {dates.map((date, index) => {
                    const isInRange =
                      index >= startIndex && index <= endIndex;

                    return (
                      <div
                        key={`${issue.id}-${date}`}
                        className="w-16 flex-shrink-0 border-r p-1"
                      >
                        {isInRange && (
                          <div
                            className={`h-8 rounded ${getBarColorByStatus(
                              issue.status
                            )} ${getConflictIndicator(
                              hasConflict
                            )} flex items-center justify-center text-xs font-semibold text-white truncate px-1`}
                            title={`${issue.chave} - ${issue.status}`}
                          >
                            {issue.storyPoints}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info */}
      {issues.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhuma issue selecionada
        </div>
      )}
    </div>
  );
}

export default GanttChart;
