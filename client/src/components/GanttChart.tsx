import React from 'react';
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

// Gera array de datas úteis (seg-sex)
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

// Encontra índice do dia útil para uma data
const getBusinessDayIndex = (date: string, businessDays: string[]): number => {
  return businessDays.findIndex(d => d === date);
};

// Calcula posição em pixels baseado no índice do dia útil
const getPixelPositionFromDayIndex = (dayIndex: number, columnWidth: number): number => {
  return dayIndex * columnWidth;
};

// Calcula largura da barra em pixels baseado em dias úteis
const getBarWidthFromDays = (startDate: string, endDate: string, businessDays: string[], columnWidth: number): number => {
  const startIndex = getBusinessDayIndex(startDate, businessDays);
  const endIndex = getBusinessDayIndex(endDate, businessDays);
  
  if (startIndex === -1 || endIndex === -1) return columnWidth;
  
  const daysSpanned = Math.max(1, endIndex - startIndex + 1);
  return daysSpanned * columnWidth;
};

// Converte pixel para data útil mais próxima
const pixelToDayIndex = (pixel: number, columnWidth: number, businessDays: string[]): number => {
  const index = Math.round(pixel / columnWidth);
  return Math.max(0, Math.min(businessDays.length - 1, index));
};

const formatDateDisplay = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const getTodayPosition = (businessDays: string[], columnWidth: number): number | null => {
  const today = new Date().toISOString().split('T')[0];
  const index = businessDays.findIndex(d => d === today);
  return index !== -1 ? index * columnWidth : null;
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

  // Memoizar businessDays para evitar re-renders infinitos
  const businessDays = React.useMemo(
    () => generateSprintDates(sprintStart, sprintEnd),
    [sprintStart, sprintEnd]
  );
  
  const columnWidth = 100; // Largura fixa por coluna (em pixels)
  const chartWidth = businessDays.length * columnWidth;
  const todayPosition = getTodayPosition(businessDays, columnWidth);

  // Validar violações
  React.useEffect(() => {
    const newViolations = new Set<string>();
    issues.forEach((issue) => {
      const startIndex = getBusinessDayIndex(issue.dataInicio, businessDays);
      const endIndex = getBusinessDayIndex(issue.dataFim, businessDays);
      
      if (startIndex === -1 || endIndex === -1) {
        newViolations.add(issue.chave);
      }
    });
    setViolations(newViolations);
  }, [issues, businessDays]);

  const handleBarMouseDown = React.useCallback((e: React.MouseEvent, chave: string, isResize: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
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
    const issue = issues.find((i) => i.chave === draggingIssue || i.chave === resizingIssue);
    
    if (!issue) return;

    try {
      if (draggingIssue) {
        // Arrastar barra
        const currentStartIndex = getBusinessDayIndex(issue.dataInicio, businessDays);
        const currentPixel = getPixelPositionFromDayIndex(currentStartIndex, columnWidth);
        const newPixel = Math.max(0, Math.min(chartWidth - columnWidth, currentPixel + deltaX));
        const newStartIndex = pixelToDayIndex(newPixel, columnWidth, businessDays);
        const newStart = businessDays[newStartIndex];
        
        // Manter duração original
        const days = storyPointsToDays(issue.storyPoints);
        const newEnd = calculateEndDate(newStart, days);
        
        onIssueUpdate(issue.chave, newStart, newEnd);
        setDragStartX(e.clientX);
      } else if (resizingIssue) {
        // Redimensionar barra
        const currentStartIndex = getBusinessDayIndex(issue.dataInicio, businessDays);
        const currentEndIndex = getBusinessDayIndex(issue.dataFim, businessDays);
        const currentPixel = getPixelPositionFromDayIndex(currentStartIndex, columnWidth);
        const newEndPixel = Math.max(currentPixel + columnWidth, currentPixel + (currentEndIndex - currentStartIndex + 1) * columnWidth + deltaX);
        const newEndIndex = pixelToDayIndex(newEndPixel, columnWidth, businessDays);
        const newEnd = businessDays[Math.min(newEndIndex, businessDays.length - 1)];
        
        onIssueUpdate(issue.chave, issue.dataInicio, newEnd);
        setDragStartX(e.clientX);
      }
    } catch (error) {
      console.error('Erro ao arrastar:', error);
    }
  }, [draggingIssue, resizingIssue, dragStartX, issues, businessDays, columnWidth, chartWidth, onIssueUpdate]);

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
            {businessDays.length} dias úteis
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
            <div className="h-12 flex items-center pr-4 border-r border-dotted border-gray-300" />
            
            {/* Header - Cabeçalho de datas */}
            <div className="relative h-12 bg-muted rounded-t border border-border border-b-0">
              <div className="flex h-full">
                {businessDays.map((date, i) => (
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
              const startIndex = getBusinessDayIndex(issue.dataInicio, businessDays);
              const barWidth = getBarWidthFromDays(issue.dataInicio, issue.dataFim, businessDays, columnWidth);
              const startPixel = startIndex !== -1 ? startIndex * columnWidth : 0;
              const isViolation = violations.has(issue.chave);
              const isDragging = draggingIssue === issue.chave;
              const isResizing = resizingIssue === issue.chave;

              return (
                <React.Fragment key={issue.chave}>
                  {/* Coluna de labels */}
                  <div className="flex flex-col justify-center pr-4 border-r border-dotted border-gray-300 py-2 min-h-12">
                    <p className="text-xs font-semibold text-foreground leading-tight">{issue.chave}</p>
                    <div className="flex gap-1 mb-0.5 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {issue.storyPoints} SP
                      </span>
                      {issue.tipo && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          {issue.tipo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate leading-tight" title={issue.resumo}>
                      {issue.resumo}
                    </p>
                  </div>

                  {/* Barra de progresso */}
                  <div className="relative min-h-12 bg-white border border-border border-t-0 flex items-center">
                    {/* Grid de colunas de fundo */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: businessDays.length }).map((_, i) => (
                        <div
                          key={i}
                          className="border-r border-dashed border-gray-200"
                          style={{ width: `${columnWidth}px` }}
                        />
                      ))}
                    </div>

                    {/* Marcador do dia atual */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-5"
                        style={{ left: `${todayPosition}px` }}
                      >
                        <Flag className="w-3 h-3 text-red-500 absolute -top-1 -left-1.5" />
                      </div>
                    )}

                    {/* Barra da issue */}
                    {startIndex !== -1 && (
                      <div
                        className={`absolute h-full rounded flex items-center px-3 cursor-move transition-all user-select-none ${
                          isViolation
                            ? 'bg-red-400 hover:bg-red-500'
                            : 'bg-blue-500 hover:bg-blue-600'
                        } ${isDragging ? 'opacity-75 shadow-lg' : ''}`}
                        style={{
                          left: `${startPixel}px`,
                          width: `${barWidth}px`,
                          zIndex: isDragging ? 10 : 1,
                        }}
                        onMouseDown={(e) => handleBarMouseDown(e, issue.chave, false)}
                      >
                        <span className="text-white text-xs font-medium truncate pointer-events-none">
                          {issue.responsavel}
                        </span>

                        {/* Resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1.5 bg-blue-700 hover:bg-blue-800 cursor-col-resize hover:w-2 transition-all"
                          onMouseDown={(e) => handleBarMouseDown(e, issue.chave, true)}
                        />
                      </div>
                    )}

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
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Dentro do período</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-400 rounded" />
          <span>Fora do período</span>
        </div>
        <div className="flex items-center gap-2">
          <Flag className="w-3 h-3 text-red-500" />
          <span>Dia atual</span>
        </div>
      </div>
    </div>
  );
}
