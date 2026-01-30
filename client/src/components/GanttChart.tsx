import { useState, useRef, useEffect, useCallback } from 'react';
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
  
  return getPixelPosition(today, sprintStart, sprintEnd, chartWidth);
};

export function GanttChart({ issues, sprintStart, sprintEnd, onIssueUpdate, onIssueRemove }: GanttChartProps) {
  const [draggingIssue, setDraggingIssue] = useState<string | null>(null);
  const [resizingIssue, setResizingIssue] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);
  const [violations, setViolations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (chartRef.current) {
      // Calcular largura para 10 colunas com ~80px cada (800px total)
      const availableWidth = chartRef.current.offsetWidth - 200;
      // Garantir mínimo de 800px para 10 colunas
      setChartWidth(Math.max(800, availableWidth));
    }
  }, []);

  useEffect(() => {
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

  const handleMouseDown = useCallback((e: React.MouseEvent, issueChave: string, mode: 'drag' | 'resize') => {
    e.preventDefault();
    
    if (mode === 'drag') {
      setDraggingIssue(issueChave);
      setDragOffset(e.clientX);
    } else {
      setResizingIssue(issueChave);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left - 200;

    setDraggingIssue((prevDragging) => {
      if (prevDragging) {
        const issue = issues.find((i) => i.chave === prevDragging);
        if (!issue) return prevDragging;

        const startPixel = getPixelPosition(issue.dataInicio, sprintStart, sprintEnd, chartWidth);
        const endPixel = getPixelPosition(issue.dataFim, sprintStart, sprintEnd, chartWidth);
        const barWidth = endPixel - startPixel;

        const newStartPixel = Math.max(0, Math.min(chartWidth - barWidth, relativeX - dragOffset / 2));
        const newStartDate = pixelToDate(newStartPixel, sprintStart, sprintEnd, chartWidth);
        const newEndDate = calculateEndDate(newStartDate, (issue.dataFim.localeCompare(issue.dataInicio) === 0 ? 1 : Math.ceil((new Date(issue.dataFim).getTime() - new Date(issue.dataInicio).getTime()) / (1000 * 60 * 60 * 24))));

        onIssueUpdate(prevDragging, newStartDate, newEndDate);
      }
      return prevDragging;
    });

    setResizingIssue((prevResizing) => {
      if (prevResizing) {
        const issue = issues.find((i) => i.chave === prevResizing);
        if (!issue) return prevResizing;

        const startPixel = getPixelPosition(issue.dataInicio, sprintStart, sprintEnd, chartWidth);
        const newEndPixel = Math.max(startPixel + 20, Math.min(chartWidth, relativeX));
        const newEndDate = pixelToDate(newEndPixel, sprintStart, sprintEnd, chartWidth);

        onIssueUpdate(prevResizing, issue.dataInicio, newEndDate);
      }
      return prevResizing;
    });
  }, [chartWidth, dragOffset, issues, onIssueUpdate, sprintEnd, sprintStart]);

  const handleMouseUp = useCallback(() => {
    setDraggingIssue(null);
    setResizingIssue(null);
  }, []);

  const sprintDates = generateSprintDates(sprintStart, sprintEnd);
  const sprintDays = sprintDates.length; // Usar length direto, não -1
  const todayPosition = getTodayPosition(sprintStart, sprintEnd, chartWidth);

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

        <div className="flex gap-0">
          <div className="w-48 flex-shrink-0" />
          
          <div className="flex-1 relative h-12 bg-muted rounded border border-border">
            <div className="flex h-full relative">
              {sprintDates.map((date, i) => (
                <div
                  key={i}
                  className="border-r border-border text-xs text-muted-foreground flex items-center justify-center"
                  style={{ width: `${chartWidth / sprintDays}px` }}
                >
                  <div className="text-center">
                    <div className="font-semibold">{formatDateDisplay(date)}</div>
                    <div className="text-xs">{i}d</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {issues.map((issue) => {
          const startPixel = getPixelPosition(issue.dataInicio, sprintStart, sprintEnd, chartWidth);
          const barWidth = getBarWidth(issue.dataInicio, issue.dataFim, sprintStart, sprintEnd, chartWidth);
          const isViolation = violations.has(issue.chave);
          const isDragging = draggingIssue === issue.chave;
          const isResizing = resizingIssue === issue.chave;

          return (
            <div key={issue.chave} className="flex gap-0">
              <div className="w-48 flex-shrink-0 pr-4">
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

              <div className="flex-1 relative h-10 bg-white rounded border border-border" style={{ position: 'relative' }}>
                <div className="absolute inset-0 flex pointer-events-none">
                  {Array.from({ length: sprintDays }).map((_, i) => (
                    <div
                      key={i}
                      className="border-r border-dashed border-gray-300"
                      style={{ width: `${chartWidth / sprintDays}px` }}
                    />
                  ))}
                </div>

                {todayPosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 flex items-start justify-center pointer-events-none"
                    style={{ left: `${todayPosition}px` }}
                  >
                    <Flag className="w-3 h-3 text-red-500 -mt-1" fill="currentColor" />
                  </div>
                )}

                <div
                  className={`absolute h-full rounded flex items-center px-3 cursor-move transition-all ${
                    isViolation
                      ? 'bg-red-400 hover:bg-red-500'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } ${isDragging ? 'opacity-75 shadow-lg' : ''}`}
                  style={{
                    left: `${startPixel}px`,
                    width: `${barWidth}px`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, issue.chave, 'drag')}
                >
                  <span className="text-xs text-white font-medium truncate">
                    {issue.responsavel || 'Sem responsável'}
                  </span>

                  <div
                    className={`absolute right-0 top-0 bottom-0 w-1 bg-white cursor-col-resize hover:w-2 transition-all ${
                      isResizing ? 'w-2' : ''
                    }`}
                    onMouseDown={(e) => handleMouseDown(e, issue.chave, 'resize')}
                  />
                </div>

                <button
                  onClick={() => onIssueRemove?.(issue.chave)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remover issue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex gap-6 text-xs text-muted-foreground">
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
    </div>
  );
}
