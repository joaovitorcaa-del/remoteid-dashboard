import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronRight, Save } from 'lucide-react';

interface Issue {
  key: string;
  summary: string;
  assignee?: string;
  status: string;
}

interface DailyFlowProps {
  currentDev: { name: string; username: string };
  issues: Issue[];
  onSaveTurn: (data: any) => void;
  onNextDev: () => void;
  isSaving?: boolean;
  isLastDev?: boolean;
}

export function DailyFlow({
  currentDev,
  issues,
  onSaveTurn,
  onNextDev,
  isSaving,
  isLastDev
}: DailyFlowProps) {
  const [currentTask, setCurrentTask] = useState('');
  const [currentTaskComment, setCurrentTaskComment] = useState('');
  const [nextTask, setNextTask] = useState('');
  const [nextTaskComment, setNextTaskComment] = useState('');
  const [hasBlocker, setHasBlocker] = useState(false);
  const [blockerIssue, setBlockerIssue] = useState('');
  const [blockerComment, setBlockerComment] = useState('');
  const [summary, setSummary] = useState('');

  const handleSave = () => {
    if (!summary.trim()) {
      alert('Por favor, preencha o resumo do turno');
      return;
    }
    if (hasBlocker && !blockerIssue.trim()) {
      alert('Por favor, indique a issue bloqueada');
      return;
    }

    onSaveTurn({
      currentTask,
      currentTaskComment,
      nextTask,
      nextTaskComment,
      hasBlocker,
      blockerIssue,
      blockerComment,
      summary
    });

    // Reset form
    setCurrentTask('');
    setCurrentTaskComment('');
    setNextTask('');
    setNextTaskComment('');
    setHasBlocker(false);
    setBlockerIssue('');
    setBlockerComment('');
    setSummary('');
  };

  return (
    <div className="h-full overflow-y-auto space-y-4 p-4">
      {/* Current Dev Header */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-xs text-blue-600 mb-1">Turno de</p>
            <h2 className="text-2xl font-bold text-blue-900">{currentDev.name}</h2>
            <p className="text-xs text-blue-700 mt-1">@{currentDev.username}</p>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {issues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Issues do Dev ({issues.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-40 overflow-y-auto">
            {issues.map((issue) => (
              <div key={issue.key} className="text-xs p-2 bg-gray-50 rounded border">
                <span className="font-mono font-bold text-blue-600">{issue.key}</span>
                <p className="text-gray-700 mt-1">{issue.summary}</p>
                <Badge variant="outline" className="text-xs mt-1">{issue.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Current Task */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Task Atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <input
            type="text"
            placeholder="Ex: PROJ-123"
            value={currentTask}
            onChange={(e) => setCurrentTask(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md"
          />
          <Textarea
            placeholder="Comentário sobre a task atual..."
            value={currentTaskComment}
            onChange={(e) => setCurrentTaskComment(e.target.value)}
            className="text-sm"
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Next Task */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Próxima Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <input
            type="text"
            placeholder="Ex: PROJ-124"
            value={nextTask}
            onChange={(e) => setNextTask(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md"
          />
          <Textarea
            placeholder="Comentário sobre a próxima task..."
            value={nextTaskComment}
            onChange={(e) => setNextTaskComment(e.target.value)}
            className="text-sm"
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Blockers */}
      <Card className={hasBlocker ? 'border-red-200 bg-red-50' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={hasBlocker}
              onCheckedChange={(checked) => setHasBlocker(checked as boolean)}
              id="has-blocker"
            />
            <label htmlFor="has-blocker" className="text-sm font-medium cursor-pointer flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Tem Impedimento
            </label>
          </div>
        </CardHeader>
        {hasBlocker && (
          <CardContent className="space-y-2">
            <input
              type="text"
              placeholder="Issue impedida (Ex: PROJ-125)"
              value={blockerIssue}
              onChange={(e) => setBlockerIssue(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
            />
            <Textarea
              placeholder="Descrição do impedimento..."
              value={blockerComment}
              onChange={(e) => setBlockerComment(e.target.value)}
              className="text-sm"
              rows={2}
            />
          </CardContent>
        )}
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumo do Turno *</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Resumo consolidado do turno..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="text-sm"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Registrar Turno
            </>
          )}
        </Button>
        {!isLastDev && (
          <Button
            onClick={onNextDev}
            variant="outline"
            className="flex-1 gap-2"
          >
            Próximo Dev
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
