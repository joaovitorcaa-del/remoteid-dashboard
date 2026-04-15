import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, RefreshCw, Filter, X, Calendar, Database, Clock, Users, Tag, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ProductivityDashboard from '@/components/ProductivityDashboard';
import TeamAnalysis from '@/components/TeamAnalysis';
import TrendsInsights from '@/components/TrendsInsights';
import AnalysisJqlConfigModal from '@/components/AnalysisJqlConfigModal';
import { AnalysisProvider, useAnalysis } from '@/contexts/AnalysisContext';

function AnalysisFiltersBar() {
  const {
    filters, setFilters, resetFilters,
    availableIssueTypes, availableProjects, availableAssignees, availableStatuses,
    isSyncing, syncData, syncStatus,
    issues, filteredIssues, loading,
  } = useAnalysis();

  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.issueTypes.length > 0 ||
    filters.projects.length > 0 ||
    filters.assignees.length > 0 ||
    filters.statuses.length > 0 ||
    filters.spMin !== undefined ||
    filters.spMax !== undefined ||
    !!filters.startDate ||
    !!filters.endDate;

  const activeFilterCount =
    (filters.issueTypes.length > 0 ? 1 : 0) +
    (filters.projects.length > 0 ? 1 : 0) +
    (filters.assignees.length > 0 ? 1 : 0) +
    (filters.statuses.length > 0 ? 1 : 0) +
    (filters.spMin !== undefined || filters.spMax !== undefined ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Barra de ações */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Botão Atualizar Dados */}
          <Button
            onClick={() => syncData()}
            disabled={isSyncing}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Atualizar Dados'}
          </Button>

          {/* Botão Filtros */}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={hasActiveFilters ? 'default' : 'outline'}
            size="sm"
            className={hasActiveFilters ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white text-xs px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Limpar filtros */}
          {hasActiveFilters && (
            <Button onClick={resetFilters} variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
              <X className="w-4 h-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Info de sync */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {syncStatus && (
            <>
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                {syncStatus.issuesInDb} issues no banco
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Sync: {syncStatus.durationMs ? `${(syncStatus.durationMs / 1000).toFixed(1)}s` : '-'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {syncStatus.completedAt
                  ? new Date(syncStatus.completedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : '-'}
              </span>
            </>
          )}
          {loading && <span className="text-blue-600">Carregando...</span>}
          {!syncStatus && !loading && (
            <span className="text-amber-600">Clique em "Atualizar Dados" para sincronizar</span>
          )}
        </div>
      </div>

      {/* Painel de filtros expandido */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Filtro por Responsável */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Users className="w-3.5 h-3.5" /> Responsável
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {availableAssignees.length === 0 && (
                  <p className="text-xs text-gray-400">Sincronize dados primeiro</p>
                )}
                {availableAssignees.map(assignee => (
                  <label key={assignee} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={filters.assignees.includes(assignee)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({ assignees: [...filters.assignees, assignee] });
                        } else {
                          setFilters({ assignees: filters.assignees.filter(a => a !== assignee) });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 truncate">{assignee}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por Status */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Tag className="w-3.5 h-3.5" /> Status
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {availableStatuses.length === 0 && (
                  <p className="text-xs text-gray-400">Sincronize dados primeiro</p>
                )}
                {availableStatuses.map(status => (
                  <label key={status} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({ statuses: [...filters.statuses, status] });
                        } else {
                          setFilters({ statuses: filters.statuses.filter(s => s !== status) });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por Issue Type */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Zap className="w-3.5 h-3.5" /> Tipo de Issue
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {availableIssueTypes.length === 0 && (
                  <p className="text-xs text-gray-400">Sincronize dados primeiro</p>
                )}
                {availableIssueTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={filters.issueTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({ issueTypes: [...filters.issueTypes, type] });
                        } else {
                          setFilters({ issueTypes: filters.issueTypes.filter(t => t !== type) });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por Projeto */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Database className="w-3.5 h-3.5" /> Projeto
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {availableProjects.length === 0 && (
                  <p className="text-xs text-gray-400">Sincronize dados primeiro</p>
                )}
                {availableProjects.map(proj => (
                  <label key={proj} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={filters.projects.includes(proj)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({ projects: [...filters.projects, proj] });
                        } else {
                          setFilters({ projects: filters.projects.filter(p => p !== proj) });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{proj}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por Story Points */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Zap className="w-3.5 h-3.5" /> Story Points
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  min={0}
                  value={filters.spMin ?? ''}
                  onChange={(e) => setFilters({ spMin: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-20 h-9 text-sm"
                />
                <span className="text-gray-400">—</span>
                <Input
                  type="number"
                  placeholder="Max"
                  min={0}
                  value={filters.spMax ?? ''}
                  onChange={(e) => setFilters({ spMax: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-20 h-9 text-sm"
                />
              </div>
            </div>

            {/* Filtro por Data Início */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data Início
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ startDate: e.target.value || undefined })}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filtro por Data Fim */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data Fim
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ endDate: e.target.value || undefined })}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tags de filtros ativos */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {filters.assignees.map(assignee => (
                <Badge key={assignee} variant="secondary" className="bg-cyan-50 text-cyan-700 cursor-pointer hover:bg-cyan-100"
                  onClick={() => setFilters({ assignees: filters.assignees.filter(a => a !== assignee) })}>
                  <Users className="w-3 h-3 mr-1" /> {assignee} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              {filters.statuses.map(status => (
                <Badge key={status} variant="secondary" className="bg-amber-50 text-amber-700 cursor-pointer hover:bg-amber-100"
                  onClick={() => setFilters({ statuses: filters.statuses.filter(s => s !== status) })}>
                  <Tag className="w-3 h-3 mr-1" /> {status} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              {filters.issueTypes.map(type => (
                <Badge key={type} variant="secondary" className="bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100"
                  onClick={() => setFilters({ issueTypes: filters.issueTypes.filter(t => t !== type) })}>
                  {type} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              {filters.projects.map(proj => (
                <Badge key={proj} variant="secondary" className="bg-green-50 text-green-700 cursor-pointer hover:bg-green-100"
                  onClick={() => setFilters({ projects: filters.projects.filter(p => p !== proj) })}>
                  {proj} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              {(filters.spMin !== undefined || filters.spMax !== undefined) && (
                <Badge variant="secondary" className="bg-orange-50 text-orange-700 cursor-pointer hover:bg-orange-100"
                  onClick={() => setFilters({ spMin: undefined, spMax: undefined })}>
                  SP: {filters.spMin ?? '0'} — {filters.spMax ?? '∞'} <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              {filters.startDate && (
                <Badge variant="secondary" className="bg-purple-50 text-purple-700 cursor-pointer hover:bg-purple-100"
                  onClick={() => setFilters({ startDate: undefined })}>
                  De: {filters.startDate} <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              {filters.endDate && (
                <Badge variant="secondary" className="bg-purple-50 text-purple-700 cursor-pointer hover:bg-purple-100"
                  onClick={() => setFilters({ endDate: undefined })}>
                  Até: {filters.endDate} <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resumo rápido de dados filtrados */}
      {issues.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Exibindo <strong className="text-gray-900">{filteredIssues.length}</strong> issues</span>
          {hasActiveFilters && (
            <span className="text-indigo-600">(filtrado de {issues.length})</span>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysisContent() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <main className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Análise</h1>
              <p className="text-gray-600 mt-1">Visualizações avançadas de produtividade e desempenho</p>
            </div>
            <div className="flex items-center gap-2">
              <AnalysisJqlConfigModal />
              <Button onClick={() => navigate('/')} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>

          {/* Barra de filtros e ações */}
          <AnalysisFiltersBar />
        </div>

        {/* Subtelas */}
        <Tabs defaultValue="productivity" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="productivity">Dashboard de Produtividade</TabsTrigger>
            <TabsTrigger value="team">Análise de Squad</TabsTrigger>
            <TabsTrigger value="trends">Tendências e Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="productivity">
            <ProductivityDashboard />
          </TabsContent>

          <TabsContent value="team">
            <TeamAnalysis />
          </TabsContent>

          <TabsContent value="trends">
            <TrendsInsights />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function Analysis() {
  return (
    <AnalysisProvider>
      <AnalysisContent />
    </AnalysisProvider>
  );
}
