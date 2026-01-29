import { useState, useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface GanttIssue {
  chave: string;
  resumo: string;
  storyPoints: number;
  responsavel: string;
  dataInicio: string;
  dataFim: string;
}

interface GanttChartProps {
  issues: GanttIssue[];
  sprintStart: string;
  sprintEnd: string;
  onIssueUpdate: (chave: string, dataInicio: string, dataFim: string) => void;
}

/**
 * Converte Story Points para duração em dias
 * 2-3 SP = 0.5 dias
 * 5 SP = 1 dia
 * 8 SP = 2 dias
 * 13 SP = 3 dias
 */
const storyPointsToDays = (sp: number): number => {
  if (sp <= 3) return 0.5;
  if (sp <= 5) return 1;
  if (sp <= 8) return 2;
  if (sp <= 13) return 3;
  return Math.ceil(sp / 5);
};

/**
 * Calcula a data de fim baseada na data de início e duração
 */
const calculateEndDate = (startDate: string, days: number): string => {
  const start = new Date(startDate);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return end.toISOString().split('T')[0];
};

/**
 * Calcula a posição em pixels para uma data dentro do período da Sprint
 */
const getPixelPosition = (date: string, sprintStart: string, sprintEnd: string, chartWidth: number): number => {
  const start = new Date(sprintStart).getTime();
  const end = new Date(sprintEnd).getTime();
  const current = new Date(date).getTime();
  
  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const daysPassed = (current - start) / (1000 * 60 * 60 * 24);
  
  return Math.max(0, Math.min(chartWidth, (daysPassed / totalDays) * chartWidth));
};

/**
 * Calcula a duração em pixels para uma barra
 */
const getBarWidth = (startDate: string, endDate: string, sprintStart: string, sprintEnd: string, chartWidth: number): number => {
  const start = new Date(sprintStart).getTime();
  const end = new Date(sprintEnd).getTime();
  const barStart = new Date(startDate).getTime();
  const barEnd = new Date(endDate).getTime();
  
  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const barDays = (barEnd - barStart) / (1000 * 60 * 60 * 24);
  
  return Math.max(20, (barDays / totalDays) * chartWidth);
};

/**
 * Converte posição em pixels para data
 */
const pixelToDate = (pixel: number, sprintStart: string, sprintEnd: string, chartWidth: number): string => {
  const start = new Date(sprintStart).getTime();
  const end = new Date(sprintEnd).getTime();
  
  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const daysPassed = (pixel / chartWidth) * totalDays;
  
  const newDate = new Date(start + daysPassed * 24 * 60 * 60 * 1000);
  return newDate.toISOString().split('T')[0];
};

export function GanttChart({ issues, sprintStart, sprintEnd, onIssueUpdate }: GanttChartProps) {
  const [draggingIssue, setDraggingIssue] = useState<string | null>(null);
  const [resizingIssue, setResizingIssue] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);
  const [violations, setViolations] = useState<Set<string>>(new Set());

  // Calcular largura do gráfico
  useEffect(() => {
    if (chartRef.current) {
      setChartWidth(chartRef.current.offsetWidth - 40);
    }
  }, []);

  // Verificar violações de datas
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

  const handleMouseDown = (e: React.MouseEvent, issueChave: string, mode: 'drag' | 'resize') => {
    e.preventDefault();
    
    if (mode === 'drag') {
      setDraggingIssue(issueChave);
      setDragOffset(e.clientX);
    } else {
      setResizingIssue(issueChave);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left - 20;

    if (draggingIssue) {
      const issue = issues.find((i) => i.chave === draggingIssue);
      if (!issue) return;

      const startPixel = getPixelPosition(issue.dataInicio, sprintStart, sprintEnd, chartWidth);
      const endPixel = getPixelPosition(issue.dataFim, sprintStart, sprintEnd, chartWidth);
      const barWidth = endPixel - startPixel;

      const newStartPixel = Math.max(0, Math.min(chartWidth - barWidth, relativeX - dragOffset / 2));
      const newStartDate = pixelToDate(newStartPixel, sprintStart, sprintEnd, chartWidth);
      const newEndDate = calculateEndDate(newStartDate, (issue.dataFim.localeCompare(issue.dataInicio) === 0 ? 1 : Math.ceil((new Date(issue.dataFim).getTime() - new Date(issue.dataInicio).getTime()) / (1000 * 60 * 60 * 24))));

      onIssueUpdate(draggingIssue, newStartDate, newEndDate);
    } else if (resizingIssue) {
      const issue = issues.find((i) => i.chave === resizingIssue);
      if (!issue) return;

      const startPixel = getPixelPosition(issue.dataInicio, sprintStart, sprintEnd, chartWidth);
      const newEndPixel = Math.max(startPixel + 20, Math.min(chartWidth, relativeX));
      const newEndDate = pixelToDate(newEndPixel, sprintStart, sprintEnd, chartWidth);

      onIssueUpdate(resizingIssue, issue.dataInicio, newEndDate);
    }
  };

  const handleMouseUp = () => {
    setDraggingIssue(null);
    setResizingIssue(null);
  };

  const sprintDays = Math.ceil((new Date(sprintEnd).getTime() - new Date(sprintStart).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div
      ref={chartRef}
      className="w-full bg-white border border-border rounded-lg p-5"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Timeline Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">Cronograma da Sprint</h3>
          <span className="text-sm text-muted-foreground">
            {sprintDays} dias ({sprintStart} a {sprintEnd})
          </span>
        </div>

        {/* Warnings */}
        {violations.size > 0 && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-medium">⚠️ {violations.size} issue(s) fora do período da Sprint</p>
              <p className="text-xs mt-1">Ajuste as datas para que todas as issues fiquem dentro do período</p>
            </div>
          </div>
        )}

        {/* Timeline Grid */}
        <div className="relative h-8 bg-muted rounded border border-border overflow-x-auto">
          <div className="flex h-full">
            {Array.from({ length: sprintDays + 1 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-border text-xs text-muted-foreground flex items-center justify-center"
                style={{ minWidth: `${chartWidth / sprintDays}px` }}
              >
                {i}d
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issues Bars */}
      <div className="space-y-4">
        {issues.map((issue) => {
          const startPixel = getPixelPosition(issue.dataInicio, sprintStart, sprintEnd, chartWidth);
          const barWidth = getBarWidth(issue.dataInicio, issue.dataFim, sprintStart, sprintEnd, chartWidth);
          const isViolation = violations.has(issue.chave);
          const isDragging = draggingIssue === issue.chave;
          const isResizing = resizingIssue === issue.chave;

          return (
            <div key={issue.chave} className="flex items-center gap-4">
              {/* Issue Info */}
              <div className="w-32 flex-shrink-0">
                <p className="text-sm font-medium text-foreground">{issue.chave}</p>
                <p className="text-xs text-muted-foreground">{issue.storyPoints} SP</p>
              </div>

              {/* Bar Container */}
              <div className="flex-1 relative h-10 bg-muted rounded border border-border">
                {/* Bar */}
                <div
                  className={`absolute h-full rounded flex items-center px-2 cursor-move transition-all ${
                    isViolation
                      ? 'bg-red-400 hover:bg-red-500'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } ${isDragging ? 'opacity-75 shadow-lg' : ''}`}
                  style={{
                    left: `${startPixel}px`,
                    width: `${barWidth}px`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, issue.chave, 'drag')}
                >
                  {/* Resize Handle */}
                  <div
                    className={`absolute right-0 top-0 bottom-0 w-1 bg-white cursor-col-resize hover:w-2 transition-all ${
                      isResizing ? 'w-2' : ''
                    }`}
                    onMouseDown={(e) => handleMouseDown(e, issue.chave, 'resize')}
                  />

                  {/* Label */}
                  <span className="text-xs text-white font-medium truncate">
                    {issue.chave}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="w-40 flex-shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  {issue.dataInicio} → {issue.dataFim}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
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
        </div>
      </div>
    </div>
  );
}
