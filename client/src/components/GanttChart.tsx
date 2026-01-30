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

// Converte Story Points para dias úteis
const storyPointsToDays = (sp: number): number => {
  if (sp <= 3) return 0.5;
  if (sp <= 5) return 1;
  if (sp <= 8) return 2;
  if (sp <= 13) return 3;
  return Math.ceil(sp / 5);
};

// Calcula data de fim baseado em dias úteis
const calculateEndDate = (startDate: string, days: number): string => {
  const start = new Date(startDate + 'T00:00:00Z');
  let current = new Date(start);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = current.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return current.toISOString().split('T')[0];
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

// Calcula largura da barra em pixels baseado em Story Points
const getBarWidthFromStoryPoints = (sp: number, columnWidth: number): number => {
  const days = storyPointsToDays(sp);
  return Math.max(columnWidth * days, columnWidth * 0.5); // Mínimo 50% de coluna
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

  // Handler para iniciar drag
  const handleBarMouseDown = React.useCallback((e: React.MouseEvent, chave: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDraggingIssue(chave);
    setDragStartX(e.clientX);
  }, []);

  // Handler para movimento do mouse
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;
    if (!draggingIssue) return;

    const deltaX = e.clientX - dragStartX;
    const issue = issues.find((i) => i.chave === draggingIssue);
    
    if (!issue) return;

    try {
      // Arrastar barra mantendo duração original
      const currentStartIndex = getBusinessDayIndex(issue.dataInicio, businessDays);
      const currentPixel = currentStartIndex * columnWidth;
      const newPixel = Math.max(0, Math.min(chartWidth - columnWidth, currentPixel + deltaX));
      const newStartIndex = pixelToDayIndex(newPixel, columnWidth, businessDays);
      const newStart = businessDays[newStartIndex];
      
      // Manter duração original baseada em Story Points
      const days = storyPointsToDays(issue.storyPoints);
      const newEnd = calculateEndDate(newStart, days);
      
      onIssueUpdate(issue.chave, newStart, newEnd);
      setDragStartX(e.clientX);
    } catch (error) {
      console.error('Erro ao arrastar:', error);
    }
  }, [draggingIssue, dragStartX, issues, businessDays, columnWidth, chartWidth, onIssueUpdate]);

  // Handler para soltar o mouse
  const handleMouseUp = React.useCallback(() => {
    setDraggingIssue(null);
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flag className="w-3 h-3 text-red-500" />
            <span>Dia atual</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDateDisplay(sprintStart)} - {formatDateDisplay(sprintEnd)}
        </p>
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Nenhuma issue selecionada</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid gap-0" style={{ gridTemplateColumns: '192px 1fr' }}>
            {/* Header - Coluna de labels */}
            <div className="relative h-12 bg-muted rounded-t-l border border-border border-b-0 border-r-0" />

            {/* Header - Cabeçalho de datas */}
            <div className="relative h-12 bg-muted rounded-t border border-border border-b-0">
              <div className="flex h-full">
                {businessDays.map((date, i) => (
                  <div
                    key={i}
                    className="border-r border-border text-xs text-muted-foreground flex items-center justify-center flex-shrink-0"
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
              const barWidth = getBarWidthFromStoryPoints(issue.storyPoints, columnWidth);
              const startPixel = startIndex !== -1 ? startIndex * columnWidth : 0;
              const isViolation = violations.has(issue.chave);
              const isDragging = draggingIssue === issue.chave;

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
                          className="border-r border-dashed border-gray-200 flex-shrink-0"
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
                        className={`absolute h-8 rounded flex items-center px-3 cursor-move transition-all user-select-none ${
                          isViolation
                            ? 'bg-red-400 hover:bg-red-500'
                            : 'bg-blue-500 hover:bg-blue-600'
                        } ${isDragging ? 'opacity-75 shadow-lg' : ''}`}
                        style={{
                          left: `${startPixel}px`,
                          width: `${barWidth}px`,
                          zIndex: isDragging ? 10 : 1,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        onMouseDown={(e) => handleBarMouseDown(e, issue.chave)}
                      >
                        <span className="text-white text-xs font-medium truncate pointer-events-none">
                          {issue.responsavel}
                        </span>
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
      )}
    </div>
  );
}
