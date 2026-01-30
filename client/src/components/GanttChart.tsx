'use client';

import { AlertCircle, Trash2, Flag } from 'lucide-react';

interface GanttIssue {
  chave: string;
  resumo: string;
  storyPoints: number;
  responsavel: string;
  tipo?: string;
  dataInicio: string;
  dataFim: string;
}

interface GanttChartProps {
  issues: GanttIssue[];
  sprintStart: string;
  sprintEnd: string;
  onIssueUpdate: (chave: string, dataInicio: string, dataFim: string) => void;
  onIssueRemove?: (chave: string) => void;
}

const storyPointsToDays = (sp: number): number => {
  if (sp <= 3) return 0.5;
  if (sp <= 5) return 1;
  if (sp <= 8) return 2;
  if (sp <= 13) return 3;
  return Math.ceil(sp / 5);
};

const calculateEndDate = (startDate: string, days: number): string => {
  const start = new Date(startDate);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return end.toISOString().split('T')[0];
};

const getPixelPosition = (date: string, sprintStart: string, sprintEnd: string, chartWidth: number): number => {
  const start = new Date(sprintStart).getTime();
  const end = new Date(sprintEnd).getTime();
  const current = new Date(date).getTime();
  
  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const daysPassed = (current - start) / (1000 * 60 * 60 * 24);
  
  return Math.max(0, Math.min(chartWidth, (daysPassed / totalDays) * chartWidth));
};

const getBarWidth = (startDate: string, endDate: string, sprintStart: string, sprintEnd: string, chartWidth: number): number => {
  const start = new Date(sprintStart).getTime();
  const end = new Date(sprintEnd).getTime();
  const barStart = new Date(startDate).getTime();
  const barEnd = new Date(endDate).getTime();
  
  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const barDays = (barEnd - barStart) / (1000 * 60 * 60 * 24);
  const pixelPerDay = chartWidth / totalDays;
  
  const calculatedWidth = (barDays / totalDays) * chartWidth;
  return Math.max(pixelPerDay * 0.5, calculatedWidth);
};

const pixelToDate = (pixel: number, sprintStart: string, sprintEnd: string, chartWidth: number): string => {
  const start = new Date(sprintStart).getTime();
  const end = new Date(sprintEnd).getTime();
  
  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const daysPassed = (pixel / chartWidth) * totalDays;
  
  const newDate = new Date(start + daysPassed * 24 * 60 * 60 * 1000);
  return newDate.toISOString().split('T')[0];
};

const generateSprintDates = (sprintStart: string, sprintEnd: string): string[] => {
  const dates: string[] = [];
  const current = new Date(sprintStart + 'T00:00:00Z');
  const end = new Date(sprintEnd + 'T00:00:00Z');
  const maxDays = 10;
  
  while (current <= end && dates.length < maxDays) {
    const dayOfWeek = current.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      const day = String(current.getUTCDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return dates;
};

const formatDateDisplay = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const getTodayPosition = (sprintStart: string, sprintEnd: string, chartWidth: number): number | null => {
  const today = new Date().toISOString().split('T')[0];
  const sprintStartTime = new Date(sprintStart).getTime();
  const sprintEndTime = new Date(sprintEnd).getTime();
  const todayTime = new Date(today).getTime();
  
  if (todayTime < sprintStartTime || todayTime > sprintEndTime) {
    return null;
  }
  
  const totalDays = (sprintEndTime - sprintStartTime) / (1000 * 60 * 60 * 24);
  const daysPassed = (todayTime - sprintStartTime) / (1000 * 60 * 60 * 24);
  
  return (daysPassed / totalDays) * chartWidth;
};

export function GanttChart({
  issues,
  sprintStart,
  sprintEnd,
  onIssueUpdate,
  onIssueRemove,
}: GanttChartProps) {
  const [draggingIssue, setDraggingIssue] = React.useState<string | null>(null);
  const [resizingIssue, setResizingIssue] = React.useState<string | null>(null);
  const [dragStartX, setDragStartX] = React.useState(0);
  const [violations, setViolations] = React.useState<Set<string>>(new Set());
  const chartRef = React.useRef<HTMLDivElement>(null);

  const chartWidth = 800;
  const sprintDates = generateSprintDates(sprintStart, sprintEnd);
  const sprintDays = sprintDates.length;
  const columnWidth = chartWidth / sprintDays;
  const todayPosition = getTodayPosition(sprintStart, sprintEnd, chartWidth);

  React.useEffect(() => {
    const newViolations = new Set<string>();
    issues.forEach((issue) => {
      const issueStart = new Date(issue.dataInicio).getTime();
      const issueEnd = new Date(issue.dataFim).getTime();
      const sprintStartTime = new Date(sprintStart).getTime();
      const sprintEndTime = new Date(sprintEnd).getTime();
      
      if (issueStart < sprintStartTime || issueEnd > sprintEndTime) {
        newViolations.add(issue.chave);
      }
    });
    setViolations(newViolations);
  }, [issues, sprintStart, sprintEnd]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent, chave: string, isResize: boolean) => {
    if (isResize) {
      setResizingIssue(chave);
    } else {
      setDraggingIssue(chave);
    }
    setDragStartX(e.clientX);
  }, []);

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;
    if (!draggingIssue && !resizingIssue) return;

    const deltaX = e.clientX - dragStartX;
    const deltaPixels = deltaX;

    const issue = issues.find((i) => i.chave === draggingIssue || i.chave === resizingIssue);
    if (!issue) return;

    if (draggingIssue) {
      const newStart = pixelToDate(getPixelPosition(issue.dataInicio, sprintStart, sprintEnd, chartWidth) + deltaPixels, sprintStart, sprintEnd, chartWidth);
      const days = storyPointsToDays(issue.storyPoints);
      const newEnd = calculateEndDate(newStart, days);
      onIssueUpdate(issue.chave, newStart, newEnd);
      setDragStartX(e.clientX);
    } else if (resizingIssue) {
      const currentWidth = getBarWidth(issue.dataInicio, issue.dataFim, sprintStart, sprintEnd, chartWidth);
      const newWidth = Math.max(columnWidth * 0.5, currentWidth + deltaPixels);
      const newEnd = pixelToDate(getPixelPosition(issue.dataInicio, sprintStart, sprintEnd, chartWidth) + newWidth, sprintStart, sprintEnd, chartWidth);
      onIssueUpdate(issue.chave, issue.dataInicio, newEnd);
      setDragStartX(e.clientX);
    }
  }, [draggingIssue, resizingIssue, dragStartX, issues, sprintStart, sprintEnd, chartWidth, onIssueUpdate]);

  const handleMouseUp = React.useCallback(() => {
    setDraggingIssue(null);
    setResizingIssue(null);
  }, []);

  return (
    <div
      ref={chartRef}
      className="w-full bg-white border border-border rounded-lg p-5"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">Cronograma da Sprint</h3>
          <span className="text-sm text-muted-foreground">
            {sprintDays} dias úteis
          </span>
        </div>

        {violations.size > 0 && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-medium">⚠️ {violations.size} issue(s) fora do período da Sprint</p>
              <p className="text-xs mt-1">Ajuste as datas para que todas as issues fiquem dentro do período</p>
            </div>
          </div>
        )}

        {/* Grid com cabeçalho e linhas de issues */}
        <div className="overflow-x-auto">
          <div style={{ display: 'grid', gridTemplateColumns: `192px ${chartWidth}px`, gap: 0 }}>
            {/* Header - Coluna de labels */}
            <div className="h-12 flex items-center pr-4 border-r border-border" />
            
            {/* Header - Cabeçalho de datas */}
            <div className="relative h-12 bg-muted rounded-t border border-border border-b-0">
              <div className="flex h-full">
                {sprintDates.map((date, i) => (
                  <div
                    key={i}
                    className="border-r border-border text-xs text-muted-foreground flex items-center justify-center"
                    style={{ width: `${columnWidth}px` }}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{formatDateDisplay(date)}</div>
                      <div className="text-xs">{i}d</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues rows */}
            {issues.map((issue) => {
              const startPixel = getPixelPosition(issue.dataInicio, sprintStart, sprintEnd, chartWidth);
              const barWidth = getBarWidth(issue.dataInicio, issue.dataFim, sprintStart, sprintEnd, chartWidth);
              const isViolation = violations.has(issue.chave);
              const isDragging = draggingIssue === issue.chave;
              const isResizing = resizingIssue === issue.chave;

              return (
                <React.Fragment key={issue.chave}>
                  {/* Coluna de labels */}
                  <div className="flex flex-col justify-center pr-4 border-r border-border py-2">
                    <p className="text-sm font-medium text-foreground">{issue.chave}</p>
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {issue.storyPoints} SP
                      </span>
                      {issue.tipo && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          {issue.tipo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate" title={issue.resumo}>
                      {issue.resumo}
                    </p>
                  </div>

                  {/* Barra de progresso */}
                  <div className="relative h-10 bg-white border border-border border-t-0 flex items-center">
                    {/* Grid de colunas de fundo */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: sprintDays }).map((_, i) => (
                        <div
                          key={i}
                          className="border-r border-dashed border-gray-300"
                          style={{ width: `${columnWidth}px` }}
                        />
                      ))}
                    </div>

                    {/* Marcador do dia atual */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 flex items-start justify-center pointer-events-none"
                        style={{ left: `${todayPosition}px` }}
                      >
                        <Flag className="w-3 h-3 text-red-500 -mt-1" fill="currentColor" />
                      </div>
                    )}

                    {/* Barra da issue */}
                    <div
                      className={`absolute h-full rounded flex items-center px-3 cursor-move transition-all ${
                        isViolation
                          ? 'bg-red-400 hover:bg-red-500'
                          : 'bg-blue-500 hover:bg-blue-600'
                      } ${isDragging ? 'opacity-75' : ''}`}
                      style={{
                        left: `${startPixel}px`,
                        width: `${barWidth}px`,
                        zIndex: isDragging ? 10 : 1,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, issue.chave, false)}
                    >
                      <span className="text-white text-xs font-medium truncate">
                        {issue.responsavel}
                      </span>

                      {/* Resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-blue-700 hover:bg-blue-800 cursor-col-resize"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, issue.chave, true);
                        }}
                      />
                    </div>

                    {/* Botão de remover */}
                    <button
                      onClick={() => onIssueRemove?.(issue.chave)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors z-20"
                      title="Remover issue"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
                    </button>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span>Dentro do período</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 rounded" />
          <span>Fora do período</span>
        </div>
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-red-500" fill="currentColor" />
          <span>Dia atual</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
