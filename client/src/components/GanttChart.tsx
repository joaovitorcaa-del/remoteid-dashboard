import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
  onIssueUpdate?: (chave: string, dataInicio: string, dataFim: string) => void;
  onIssueRemove?: (chave: string) => void;
  onResponsavelChange?: (chave: string, novoResponsavel: string) => void;
  showLegend?: boolean;
}

const storyPointsToDays = (sp: number): number => {
  if (sp <= 3) return 0.5;
  if (sp <= 5) return 1;
  if (sp <= 8) return 2;
  if (sp <= 13) return 3;
  return Math.ceil(sp / 5);
};

// Calcula data de fim baseado em dias úteis
const calculateEndDate = (startDate: string, days: number): string => {
  if (days < 1) {
    return startDate;
  }
  
  const start = new Date(startDate + 'T00:00:00Z');
  let current = new Date(start);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    const dayOfWeek = current.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
      if (daysAdded === days) {
        return current.toISOString().split('T')[0];
      }
    }
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
      
      if (issue1.responsavel !== issue2.responsavel) continue;
      
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

export function GanttChart({ issues, sprintStart, sprintEnd, showLegend = true }: GanttChartProps) {
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
      {showLegend && (
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
      )}

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
              <div key="header-issue" className="w-40 flex-shrink-0 border-r p-2 font-semibold">
                Issue
              </div>
              {dates && dates.length > 0 && dates.map((date) => (
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
            {issues && issues.length > 0 && issues.map((issue) => {
              const startIndex = dates.indexOf(issue.dataInicio);
              const endIndex = dates.indexOf(issue.dataFim);
              const hasConflict = conflicts.has(issue.id);

              // Filtrar datas que estão no range
              const datesInRange = dates.filter((_, index) => 
                index >= startIndex && index <= endIndex
              );

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
                  {datesInRange.map((date) => {
                    const barColor = getBarColorByStatus(issue.status);
                    const conflictClass = getConflictIndicator(hasConflict);
                    const barClass = `h-8 rounded ${barColor} ${conflictClass} flex items-center justify-center text-xs font-semibold text-white truncate px-1`;

                    return (
                      <div
                        key={`${issue.id}-${date}`}
                        className="w-16 flex-shrink-0 border-r p-1"
                      >
                        <div
                          className={barClass}
                          title={`${issue.chave} - ${issue.status}`}
                        >
                          {issue.storyPoints}
                        </div>
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
