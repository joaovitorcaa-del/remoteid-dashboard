import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SprintIssue {
  chave: string;
  resumo: string;
  storyPoints: number;
  responsavel: string;
  epicKey?: string;
  epicSummary?: string;
}

interface StoryPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: SprintIssue[];
  totalStoryPoints: number;
}

export function StoryPointsModal({ isOpen, onClose, issues, totalStoryPoints }: StoryPointsModalProps) {
  const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<string | null>(null);

  // Agrupar por desenvolvedor
  const developerStats = useMemo(() => {
    const stats: Record<string, { count: number; storyPoints: number }> = {};
    
    issues.forEach(issue => {
      if (!stats[issue.responsavel]) {
        stats[issue.responsavel] = { count: 0, storyPoints: 0 };
      }
      stats[issue.responsavel].count++;
      stats[issue.responsavel].storyPoints += issue.storyPoints;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        percentage: ((data.storyPoints / totalStoryPoints) * 100).toFixed(1),
      }))
      .sort((a, b) => b.storyPoints - a.storyPoints);
  }, [issues, totalStoryPoints]);

  // Agrupar por épico
  const epicStats = useMemo(() => {
    const stats: Record<string, { count: number; storyPoints: number; key: string; summary: string }> = {};
    
    issues.forEach(issue => {
      const epicKey = issue.epicKey || 'Sem Épico';
      const epicSummary = issue.epicSummary || 'Sem Épico';
      
      if (!stats[epicKey]) {
        stats[epicKey] = { count: 0, storyPoints: 0, key: epicKey, summary: epicSummary };
      }
      stats[epicKey].count++;
      stats[epicKey].storyPoints += issue.storyPoints;
    });

    return Object.entries(stats)
      .map(([key, data]) => ({
        name: data.key === 'Sem Épico' ? 'Sem Épico' : key,
        summary: data.summary,
        ...data,
        percentage: ((data.storyPoints / totalStoryPoints) * 100).toFixed(1),
      }))
      .sort((a, b) => b.storyPoints - a.storyPoints);
  }, [issues, totalStoryPoints]);

  // Filtrar issues baseado na seleção
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchDeveloper = !selectedDeveloper || issue.responsavel === selectedDeveloper;
      const matchEpic = !selectedEpic || (issue.epicKey === selectedEpic || (selectedEpic === 'Sem Épico' && !issue.epicKey));
      return matchDeveloper && matchEpic;
    });
  }, [issues, selectedDeveloper, selectedEpic]);

  const filteredStoryPoints = filteredIssues.reduce((sum, issue) => sum + issue.storyPoints, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Distribuição de Story Points</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo Total */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total de Story Points</p>
              <p className="text-3xl font-bold text-blue-600">{totalStoryPoints}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Issues Filtradas</p>
              <p className="text-3xl font-bold text-green-600">{filteredIssues.length}</p>
              <p className="text-sm text-gray-500 mt-1">{filteredStoryPoints} SP</p>
            </div>
          </div>

          {/* Abas */}
          <Tabs defaultValue="developer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="developer">Por Desenvolvedor</TabsTrigger>
              <TabsTrigger value="epic">Por Épico</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>

            {/* Tab: Por Desenvolvedor */}
            <TabsContent value="developer" className="space-y-4">
              <div className="space-y-2">
                {developerStats.map(dev => (
                  <div
                    key={dev.name}
                    onClick={() => setSelectedDeveloper(selectedDeveloper === dev.name ? null : dev.name)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedDeveloper === dev.name
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{dev.name}</span>
                      <span className="text-sm text-gray-600">{dev.count} issues</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${dev.percentage}%` }}
                        />
                      </div>
                      <span className="font-bold text-blue-600 min-w-fit">{dev.storyPoints} SP ({dev.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab: Por Épico */}
            <TabsContent value="epic" className="space-y-4">
              <div className="space-y-2">
                {epicStats.map(epic => (
                  <div
                    key={epic.key}
                    onClick={() => setSelectedEpic(selectedEpic === epic.key ? null : epic.key)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedEpic === epic.key
                        ? 'bg-purple-100 border-2 border-purple-500'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="font-semibold">{epic.name}</span>
                        {epic.key !== 'Sem Épico' && (
                          <p className="text-xs text-gray-500">{epic.key} - {epic.summary}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-600">{epic.count} issues</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-500 h-full"
                          style={{ width: `${epic.percentage}%` }}
                        />
                      </div>
                      <span className="font-bold text-purple-600 min-w-fit">{epic.storyPoints} SP ({epic.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab: Issues */}
            <TabsContent value="issues" className="space-y-4">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredIssues.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">Nenhuma issue encontrada com os filtros selecionados</p>
                ) : (
                  filteredIssues.map(issue => (
                    <div key={issue.chave} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-semibold text-sm">{issue.chave}</p>
                          <p className="text-xs text-gray-600">{issue.resumo}</p>
                        </div>
                        <span className="font-bold text-blue-600">{issue.storyPoints} SP</span>
                      </div>
                      <div className="flex gap-2 text-xs text-gray-600 mt-2">
                        <span>👤 {issue.responsavel}</span>
                        {issue.epicKey && <span>📋 {issue.epicKey} - {issue.epicSummary}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-gray-600 text-center">
                Total: {filteredStoryPoints} SP em {filteredIssues.length} issues
              </p>
            </TabsContent>
          </Tabs>

          {/* Botão para limpar filtros */}
          {(selectedDeveloper || selectedEpic) && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDeveloper(null);
                setSelectedEpic(null);
              }}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
