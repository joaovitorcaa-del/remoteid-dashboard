import { AlertCircle, Trash2, ChevronDown, CheckCircle2 } from 'lucide-react';
import React from 'react';

interface GanttIssue {
  chave: string;
  resumo: string;
  storyPoints: number;
  responsavel: string;
  tipo?: string;
  status?: string;
  dataInicio: string | Date;
  dataFim: string | Date;
}

interface GanttChartProps {
  issues: GanttIssue[];
  sprintStart: string;
  sprintEnd: string;
  onIssueUpdate: (chave: string, dataInicio: string, dataFim: string) => void;
  onIssueRemove?: (chave: string) => void;
  onResponsavelChange?: (chave: string, novoResponsavel: string) => void;
  showLegend?: boolean;
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
  // Se é menos de 1 dia (ex: 0.5), termina no mesmo dia
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
  return Math.max(columnWidth * days, columnWidth * 0.5);
};

// Converte pixel para data útil mais próxima
const pixelToDayIndex = (pixel: number, columnWidth: number, businessDays: string[]): number => {
  const index = Math.round(pixel / columnWidth);
  return Math.max(0, Math.min(businessDays.length - 1, index));
};

// Converte Date ou string para formato YYYY-MM-DD
const toDateString = (date: string | Date): string => {
  if (typeof date === 'string') return date;
  if (date instanceof Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(date);
};

const formatDateDisplay = (dateString: string | Date): string => {
  const dateStr = toDateString(dateString);
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const getTodayPosition = (businessDays: string[], columnWidth: number): { index: number; pixel: number } | null => {
  const today = new Date().toISOString().split('T')[0];
  const index = businessDays.findIndex(d => d === today);
  return index !== -1 ? { index, pixel: index * columnWidth } : null;
};

// Detecta conflitos entre issues
const detectConflicts = (issues: GanttIssue[], businessDays: string[]): Set<string> => {
  const conflicts = new Set<string>();
  
  for (let i = 0; i < issues.length; i++) {
    for (let j = i + 1; j < issues.length; j++) {
      const issue1 = issues[i];
      const issue2 = issues[j];
      
      if (issue1.responsavel !== issue2.responsavel) continue;
      
      const start1 = getBusinessDayIndex(toDateString(issue1.dataInicio), businessDays);
      const end1 = getBusinessDayIndex(toDateString(issue1.dataFim), businessDays);
      const start2 = getBusinessDayIndex(toDateString(issue2.dataInicio), businessDays);
      const end2 = getBusinessDayIndex(toDateString(issue2.dataFim), businessDays);
      
      if (start1 !== -1 && end1 !== -1 && start2 !== -1 && end2 !== -1) {
        if (!(end1 < start2 || end2 < start1)) {
          conflicts.add(issue1.chave);
          conflicts.add(issue2.chave);
        }
      }
    }
  }
  
  return conflicts;
};

// Retorna cor baseada no status
const getBarColorByStatus = (issue: GanttIssue): string => {
  const status = issue.status || '';
  const today = new Date().toISOString().split('T')[0];
  const dataFim = toDateString(issue.dataFim);
  
  const isAfterToday = dataFim > today;
  const isToday = dataFim === today;
  const isBeforeToday = dataFim < today;
  
  if (status === 'Ready to Sprint' || status === 'Dev to Do') {
    return 'bg-blue-500 hover:bg-blue-600';
  }
  
  if (status === 'Code Doing') {
    if (isAfterToday) return 'bg-green-500 hover:bg-green-600';
    if (isToday) return 'bg-orange-500 hover:bg-orange-600';
    if (isBeforeToday) return 'bg-red-500 hover:bg-red-600';
  }
  
  if (status === 'Code Review') {
    if (isAfterToday) return 'bg-green-500 hover:bg-green-600';
    if (isToday) return 'bg-orange-500 hover:bg-orange-600';
    if (isBeforeToday) return 'bg-red-500 hover:bg-red-600';
  }
  
  if (status === 'Test to Do' || status === 'Test Doing' || status === 'Staging') {
    return 'bg-purple-500 hover:bg-purple-600';
  }
  
  return 'bg-blue-500 hover:bg-blue-600';
};

// Retorna classes adicionais para indicar conflito
const getConflictIndicator = (isConflict: boolean): string => {
  if (isConflict) {
    return 'border-2 border-red-600 shadow-md shadow-red-500/50';
  }
  return '';
};

// Componente de Legenda de Cores
function ColorLegend() {
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-border">
      <h4 className="text-sm font-semibold text-foreground mb-3">Legenda de Cores</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span className="text-xs text-muted-foreground">Ready/Dev To Do</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span className="text-xs text-muted-foreground">Em Desenvolvimento</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded" />
          <span className="text-xs text-muted-foreground">Em Teste</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded" />
          <span className="text-xs text-muted-foreground">Vence Hoje</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded" />
          <span className="text-xs text-muted-foreground">Atrasado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-red-600 rounded" />
          <span className="text-xs text-muted-foreground">Conflito (borda)</span>
        </div>
      </div>
    </div>
  );
}

// Componente de Dropdown de Responsáveis
function ResponsavelDropdown({
  isOpen,
  position,
  responsaveis,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  position: { x: number; y: number };
  responsaveis: string[];
  onSelect: (responsavel: string) => void;
  onClose: () => void;
}) {
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white border border-border rounded-lg shadow-lg py-1 min-w-48"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {responsaveis.map((resp) => (
        <button
          key={resp}
          onClick={() => {
            onSelect(resp);
            onClose();
          }}
          className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        >
          {resp}
        </button>
      ))}
    </div>
  );
}

export function GanttChart({
  issues,
  sprintStart,
  sprintEnd,
  onIssueUpdate,
  onIssueRemove,
  onResponsavelChange,
  showLegend = true,
}: GanttChartProps) {
  const [draggingIssue, setDraggingIssue] = React.useState<string | null>(null);
  const [dragStartX, setDragStartX] = React.useState(0);
  const [draggedPositions, setDraggedPositions] = React.useState<Map<string, { start: string; end: string }>>(new Map());
  const [violations, setViolations] = React.useState<Set<string>>(new Set());
  const [editingResponsavel, setEditingResponsavel] = React.useState<string | null>(null);
  const [editingDropdownOpen, setEditingDropdownOpen] = React.useState(false);
  const [editingDropdownPosition, setEditingDropdownPosition] = React.useState({ x: 0, y: 0 });
  const chartRef = React.useRef<HTMLDivElement>(null);
  
  // Extrair lista única de responsáveis
  const responsaveis = React.useMemo(() => {
    const unique = new Set(issues.map(i => i.responsavel).filter(Boolean));
    return Array.from(unique).sort();
  }, [issues]);

  // Memoizar businessDays
  const businessDays = React.useMemo(
    () => generateSprintDates(sprintStart, sprintEnd),
    [sprintStart, sprintEnd]
  );
  
  const columnWidth = 100;
  const chartWidth = businessDays.length * columnWidth;
  const todayPosition = getTodayPosition(businessDays, columnWidth);

  // Validar conflitos apenas com dados do banco (não com posições temporárias)
  React.useEffect(() => {
    const conflicts = detectConflicts(issues, businessDays);
    setViolations(conflicts);
  }, [issues, businessDays]);

  // Handler para iniciar drag
  const handleBarMouseDown = React.useCallback((e: React.MouseEvent, chave: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDraggingIssue(chave);
    setDragStartX(e.clientX);
  }, []);

  // Handler para movimento do mouse - SEM salvar no banco
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;
    if (!draggingIssue) return;

    const deltaX = e.clientX - dragStartX;
    const issue = issues.find((i) => i.chave === draggingIssue);
    
    if (!issue) return;

    try {
      const startStr = toDateString(issue.dataInicio);
      const currentStartIndex = getBusinessDayIndex(startStr, businessDays);
      const currentPixel = currentStartIndex * columnWidth;
      const newPixel = Math.max(0, Math.min(chartWidth - columnWidth, currentPixel + deltaX));
      const newStartIndex = pixelToDayIndex(newPixel, columnWidth, businessDays);
      const newStart = businessDays[newStartIndex];
      
      const days = storyPointsToDays(issue.storyPoints);
      const newEnd = calculateEndDate(newStart, days);
      
      // Armazenar posição temporária SEM salvar no banco
      setDraggedPositions(prev => new Map(prev).set(draggingIssue, { start: newStart, end: newEnd }));
      setDragStartX(e.clientX);
    } catch (error) {
      console.error('Erro ao arrastar:', error);
    }
  }, [draggingIssue, dragStartX, issues, businessDays, columnWidth, chartWidth]);

  // Handler para soltar o mouse
  const handleMouseUp = React.useCallback(() => {
    setDraggingIssue(null);
  }, []);

  // Handler para clicar na barra e editar responsável
  const handleBarClick = React.useCallback((e: React.MouseEvent, chave: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEditingResponsavel(chave);
    setEditingDropdownOpen(true);
    setEditingDropdownPosition({ x: rect.left, y: rect.bottom + 5 });
  }, []);

  // Handler para selecionar novo responsável
  const handleResponsavelSelect = React.useCallback((novoResponsavel: string) => {
    if (editingResponsavel) {
      onResponsavelChange?.(editingResponsavel, novoResponsavel);
      setEditingDropdownOpen(false);
      setEditingResponsavel(null);
    }
  }, [editingResponsavel, onResponsavelChange]);

  // Handler para verificar conflitos e salvar
  const handleVerifyAndSave = React.useCallback(() => {
    if (draggedPositions.size === 0) return;

    // Criar cópia das issues com as posições arrastadas
    const updatedIssues = issues.map(issue => {
      const draggedPos = draggedPositions.get(issue.chave);
      if (draggedPos) {
        return {
          ...issue,
          dataInicio: draggedPos.start,
          dataFim: draggedPos.end,
        };
      }
      return issue;
    });

    // Detectar conflitos com as novas posições
    const conflicts = detectConflicts(updatedIssues, businessDays);
    
    if (conflicts.size > 0) {
      // Mostrar alerta de conflito
      const conflictingIssues = Array.from(conflicts).join(', ');
      alert(`⚠️ Conflito detectado com as issues: ${conflictingIssues}\n\nAjuste as posições e tente novamente.`);
      return;
    }

    // Sem conflitos - salvar todas as mudanças
    draggedPositions.forEach((pos, chave) => {
      onIssueUpdate(chave, pos.start, pos.end);
    });

    // Limpar posições arrastadas
    setDraggedPositions(new Map());
  }, [draggedPositions, issues, businessDays, onIssueUpdate]);

  // Função para obter a posição visual de uma issue (considerando drag temporário)
  const getIssueVisualPosition = (issue: GanttIssue) => {
    const draggedPos = draggedPositions.get(issue.chave);
    const startStr = toDateString(draggedPos?.start || issue.dataInicio);
    const startIndex = getBusinessDayIndex(startStr, businessDays);
    const barWidth = getBarWidthFromStoryPoints(issue.storyPoints, columnWidth);
    const startPixel = startIndex !== -1 ? startIndex * columnWidth : 0;
    
    return { startIndex, startPixel, barWidth };
  };

  return (
    <div
      ref={chartRef}
      className="w-full bg-white border border-border rounded-lg p-5"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {showLegend && <ColorLegend />}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">Cronograma da Sprint</h3>
          <div className="flex items-center gap-2">
            {draggedPositions.size > 0 && (
              <button
                onClick={handleVerifyAndSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verificar Conflito ({draggedPositions.size})
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              <span>Dia atual</span>
            </div>
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
              {todayPosition !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-orange-500 z-10 shadow-md"
                  style={{ left: `${todayPosition.pixel}px`, transform: 'translateX(-50%)' }}
                />
              )}
            </div>

            {/* Issues rows */}
            {issues.map((issue) => {
              const { startIndex, startPixel, barWidth } = getIssueVisualPosition(issue);
              const isViolation = violations.has(issue.chave);
              const isDragging = draggingIssue === issue.chave;
              const isDragged = draggedPositions.has(issue.chave);

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
                      {Array.from({ length: businessDays.length }).map((_, i) => {
                        const isToday = todayPosition !== null && i === todayPosition.index;
                        return (
                          <div
                            key={i}
                            className={`border-r border-dashed flex-shrink-0 ${
                              isToday ? 'bg-gray-100 border-gray-300' : 'border-gray-200'
                            }`}
                            style={{ width: `${columnWidth}px` }}
                          />
                        );
                      })}
                    </div>

                    {/* Marcador do dia atual */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-orange-500 z-10 shadow-md"
                        style={{ left: `${todayPosition.pixel}px`, transform: 'translateX(-50%)' }}
                      />
                    )}

                    {/* Barra da issue */}
                    {startIndex !== -1 && (
                      <div
                        className={`absolute h-8 rounded flex items-center px-3 cursor-pointer transition-all user-select-none ${
                          getBarColorByStatus(issue)
                        } ${getConflictIndicator(isViolation)} ${isDragging ? 'opacity-75 shadow-lg' : ''} ${isDragged ? 'opacity-90' : ''}`}
                        style={{
                          left: `${startPixel}px`,
                          width: `${barWidth}px`,
                          zIndex: isDragging ? 10 : 1,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        onMouseDown={(e) => handleBarMouseDown(e, issue.chave)}
                        onClick={(e) => handleBarClick(e, issue.chave)}
                        title="Clique para editar responsável"
                      >
                        <span className="text-white text-xs font-medium truncate pointer-events-none flex-1">
                          {issue.responsavel}
                        </span>
                        <ChevronDown className="w-3 h-3 text-white ml-1 flex-shrink-0 pointer-events-none" />
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

      <ResponsavelDropdown
        isOpen={editingDropdownOpen}
        position={editingDropdownPosition}
        responsaveis={responsaveis}
        onSelect={handleResponsavelSelect}
        onClose={() => setEditingDropdownOpen(false)}
      />
    </div>
  );
}

export default GanttChart;
