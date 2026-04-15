import { useState } from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { trpc } from '@/lib/trpc';

export default function AnalysisJqlConfigModal() {
  const { analysisJql, setAnalysisJql, resetAnalysisJql, defaultAnalysisJql } = useAnalysis();
  const [isOpen, setIsOpen] = useState(false);
  const [tempJql, setTempJql] = useState(analysisJql);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);



  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempJql(analysisJql);
      setValidationError(null);
    }
    setIsOpen(open);
  };

  const handleSave = async () => {
    // Validação básica
    if (!tempJql.trim()) {
      setValidationError('JQL não pode estar vazio');
      return;
    }

    // Verificar se contém palavras-chave mínimas
    const jqlLower = tempJql.toLowerCase();
    if (!jqlLower.includes('project') && !jqlLower.includes('key')) {
      setValidationError('JQL deve conter pelo menos "project" ou "key"');
      return;
    }

    setIsSaving(true);
    try {
      // Salvar JQL customizado
      setAnalysisJql(tempJql);
      setValidationError(null);
      setIsOpen(false);
    } catch (error) {
      setValidationError('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTempJql(defaultAnalysisJql);
    resetAnalysisJql();
    setValidationError(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Configuração JQL
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configuração de JQL - Página Análise</DialogTitle>
          <DialogDescription>
            Customize a query JQL para carregar dados específicos na página de Análise. A query será persistida e usada para alimentar todos os gráficos e métricas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campo de entrada JQL */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              JQL Query
            </label>
            <textarea
              value={tempJql}
              onChange={(e) => {
                setTempJql(e.target.value);
                setValidationError(null);
              }}
              placeholder="Ex: project IN ('RemoteID', 'DesktopID') AND created >= '2025-07-01' ORDER BY priority DESC"
              className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Erro de validação */}
          {validationError && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Erro de Validação</p>
                <p className="text-sm text-red-700 mt-1">{validationError}</p>
              </div>
            </div>
          )}

          {/* Informações úteis */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">Dicas:</p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Use operadores em minúsculas: <code className="bg-blue-100 px-1 rounded">and</code>, <code className="bg-blue-100 px-1 rounded">or</code>, <code className="bg-blue-100 px-1 rounded">in</code></li>
              <li>Sempre termine com <code className="bg-blue-100 px-1 rounded">ORDER BY</code> para consistência</li>
              <li>Exemplo: <code className="bg-blue-100 px-1 rounded">project IN (&quot;RemoteID&quot;) AND created &gt;= &quot;2025-07-01&quot; ORDER BY priority DESC</code></li>
            </ul>
          </div>

          {/* JQL Atual */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">JQL Atual (Padrão):</p>
            <p className="text-xs font-mono text-gray-700 break-words">{defaultAnalysisJql}</p>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
            className="text-orange-600 hover:text-orange-700"
          >
            Restaurar Padrão
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
