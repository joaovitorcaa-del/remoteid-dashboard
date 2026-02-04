
import React from 'react';
import { AlertCircle, ChevronDown, Trash2, Save, X } from 'lucide-react';

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
  return '';
};

// Formata data para exibição
const formatDateDisplay = (date: string): string => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}`;
};

// Retorna cor baseada no status da issue e data de fim
// Regra:
// 1 = Ready/Dev To Do (Futuro) = Cinza
// 2 = Done = Verde
// 3 = Ready/Dev To Do/Code Doing/Code Review & dataFim < hoje = Vermelho
// 4 = Ready/Dev To Do/Code Doing/Code Review & dataFim > hoje = Verde
// 5 = Ready/Dev To Do/Code Doing/Code Review & dataFim = hoje = Laranja
// 6 = Test ou Staging = Roxo
const getBarColorByStatus = (issue: GanttIssue): string => {
  const status = issue.status || '';
  const today = new Date().toISOString().split('T')[0];
  const dataFim = typeof issue.dataFim === 'string' ? issue.dataFim : toDateString(issue.dataFim);
  
  // Done = Verde
  if (status.includes('Done')) {
    return 'bg-green-500 hover:bg-green-600';
  }
  
  // Test ou Staging = Roxo
  if (status.includes('Test') || status.includes('Staging')) {
    return 'bg-purple-500 hover:bg-purple-600';
  }
  
  // Status=Doing AND dataFim>Hoje --> Amarelo
  if (status.includes('Doing') && dataFim > today) {
    return 'bg-yellow-500 hover:bg-yellow-600';
  }
  
  // Status=Dev To Do AND dataFim>hoje --> Azul
  if (status.includes('Dev To Do') && dataFim > today) {
    return 'bg-blue-500 hover:bg-blue-600';
  }
  
  // Verifica se o status é um dos que considera data
  const statusComData = status.includes('Ready') || status.includes('Dev To Do') || 
                        status.includes('CODE DOING') || status.includes('Code Doing') ||
                        status.includes('CODE REVIEW') || status.includes('Code Review');
  
  if (statusComData) {
    if (dataFim < today) {
      // dataFim < hoje = Vermelho (Atrasado)
      return 'bg-red-500 hover:bg-red-600';
    } else if (dataFim === today) {
      // dataFim = hoje = Laranja (Vence Hoje)
      return 'bg-orange-500 hover:bg-orange-600';
    } else {
      // dataFim > hoje = Verde (No prazo)
      return 'bg-green-500 hover:bg-green-600';
    }
  }
  
  // Ready/Dev To Do (Futuro) = Cinza
  if ((status.includes('Ready') || status.includes('Dev To Do')) && dataFim > today) {
    return 'bg-gray-500 hover:bg-gray-600';
  }
  
  // Padrão
  return 'bg-gray-500 hover:bg-gray-600';
};

// Componente de Legenda
function ColorLegend() {
  return (
    <div className="mb-4 p-3 bg-muted rounded-lg">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-500 rounded" />
          <span className="text-xs text-muted-foreground">Ready/Dev To Do (futuro)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span className="text-xs text-muted-foreground">Dev To Do (dataFim &gt; hoje)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded" />
          <span className="text-xs text-muted-foreground">Doing (dataFim &gt; hoje)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span className="text-xs text-muted-foreground">Done / No Prazo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded" />
          <span className="text-xs text-muted-foreground">Vence Hoje (dataFim = hoje)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded" />
          <span className="text-xs text-muted-foreground">Atrasado (dataFim &lt; hoje)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded" />
          <span className="text-xs text-muted-foreground">Test/Staging</span>
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
  const [draggedPositions, setDraggedPositions] = React.useState<Map<string, { start: string; end: string }>>(new Map());
  const [editingResponsavel, setEditingResponsavel] = React.useState<string | null>(null);
  const [editingDropdownOpen, setEditingDropdownOpen] = React.useState(false);
  const [editingDropdownPosition, setEditingDropdownPosition] = React.useState({ x: 0, y: 0 });
  const chartRef = React.useRef<HTMLDivElement>(null);
  
  // Refs para drag sem re-renders
  const dragStateRef = React.useRef({
    isDragging: false,
    draggingIssue: '',
    startX: 0,
    currentX: 0,
    originalStartIndex: 0,
  });
  const rafIdRef = React.useRef<number | null>(null);
  
  // Extrair lista única de responsáveis
  const responsaveis = React.useMemo(() => {
    const unique = new Set(issues.map(i => i.responsavel).filter(Boolean));
    return Array.from(unique).sort();
  }, [issues]);

  const businessDays = React.useMemo(() => generateSprintDates(sprintStart, sprintEnd), [sprintStart, sprintEnd]);
  const columnWidth = 80;
  const chartWidth = businessDays.length * columnWidth;

  const todayPosition = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const index = getBusinessDayIndex(today, businessDays);
    if (index === -1) return null;
    return { index, pixel: index * columnWidth + columnWidth / 2 };
  }, [businessDays]);

  // Handler para iniciar drag
  const handleDragStart = React.useCallback((e: React.MouseEvent, chave: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const issue = issues.find((i) => i.chave === chave);
    if (!issue) return;

    const startStr = toDateString(issue.dataInicio);
    const startIndex = getBusinessDayIndex(startStr, businessDays);
    
    dragStateRef.current = {
      isDragging: true,
      draggingIssue: chave,
      startX: e.clientX,
      currentX: e.clientX,
      originalStartIndex: startIndex,
    };
    
    setDraggingIssue(chave);
  }, [issues, businessDays]);

  // Atualizar posição durante drag com requestAnimationFrame
  const updateDragPosition = React.useCallback(() => {
    if (!dragStateRef.current.isDragging || !chartRef.current) return;

    const { draggingIssue, startX, currentX, originalStartIndex } = dragStateRef.current;
    const deltaX = currentX - startX;
    const issue = issues.find((i) => i.chave === draggingIssue);
    
    if (!issue) return;

    try {
      const endStr = toDateString(issue.dataFim);
      const currentEndIndex = getBusinessDayIndex(endStr, businessDays);
      const daysDuration = currentEndIndex - originalStartIndex;
      
      // Calcular novo índice de início
      const deltaColumns = Math.round(deltaX / columnWidth);
      const newStartIndex = Math.max(0, Math.min(businessDays.length - 1 - daysDuration, originalStartIndex + deltaColumns));
      const newStart = businessDays[newStartIndex];
      const newEnd = businessDays[Math.min(businessDays.length - 1, newStartIndex + daysDuration)];
      
      setDraggedPositions(prev => new Map(prev).set(draggingIssue, { start: newStart, end: newEnd }));
    } catch (error) {
      console.error('Erro ao arrastar:', error);
    }
  }, [issues, businessDays, columnWidth]);

  // Handler para movimento do mouse durante drag
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!dragStateRef.current.isDragging) return;

    dragStateRef.current.currentX = e.clientX;

    // Cancelar RAF anterior se existir
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Agendar atualização com RAF
    rafIdRef.current = requestAnimationFrame(updateDragPosition);
  }, [updateDragPosition]);

  // Handler para soltar o mouse
  const handleMouseUp = React.useCallback(() => {
    dragStateRef.current.isDragging = false;
    
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    setDraggingIssue(null);
  }, []);

  // Limpar RAF ao desmontar
  React.useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
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

  // Handler para salvar mudanças
  const handleSaveChanges = React.useCallback(() => {
    draggedPositions.forEach((position, chave) => {
      onIssueUpdate(chave, position.start, position.end);
    });
    setDraggedPositions(new Map());
  }, [draggedPositions, onIssueUpdate]);

  // Handler para descartar mudanças
  const handleDiscardChanges = React.useCallback(() => {
    setDraggedPositions(new Map());
  }, []);

  const getIssueVisualPosition = (issue: GanttIssue) => {
    const dragged = draggedPositions.get(issue.chave);
    const startStr = dragged ? dragged.start : toDateString(issue.dataInicio);
    const endStr = dragged ? dragged.end : toDateString(issue.dataFim);
    
    const startIndex = getBusinessDayIndex(startStr, businessDays);
    const endIndex = getBusinessDayIndex(endStr, businessDays);
    
    if (startIndex === -1 || endIndex === -1) {
      return { startIndex: -1, startPixel: 0, barWidth: 0 };
    }
    
    const startPixel = startIndex * columnWidth;
    const barWidth = (endIndex - startIndex + 1) * columnWidth;
    
    return { startIndex, startPixel, barWidth };
  };

  const hasChanges = draggedPositions.size > 0;

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
            {hasChanges && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveChanges}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Salvar Plano
                </button>
                <button
                  onClick={handleDiscardChanges}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Descartar
                </button>
              </div>
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

                    {/* Barra da issue com drag */}
                    {startIndex !== -1 && (
                      <div
                        className={`absolute h-8 rounded flex items-center px-3 cursor-grab active:cursor-grabbing transition-all user-select-none border border-gray-300 ${
                          getBarColorByStatus(issue)
                        } ${isDragging ? 'opacity-75 shadow-lg' : ''} ${isDragged ? 'opacity-90' : ''}`}
                        style={{
                          left: `${startPixel}px`,
                          width: `${barWidth}px`,
                          zIndex: isDragging ? 10 : 1,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        onMouseDown={(e) => handleDragStart(e, issue.chave)}
                        onClick={(e) => !isDragging && handleBarClick(e, issue.chave)}
                        title="Arraste para mover. Clique para editar responsável."
                      >
                        {/* Conteúdo da barra */}
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
