import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFilter } from '@/contexts/FilterContext';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, Plus, Trash2, Save, Eye, Edit2, Star } from 'lucide-react';

interface JqlFilter {
  id: number;
  nome: string;
  jql: string;
  descricao?: string;
  isDefault?: boolean;
}

export default function Settings() {
  const [, navigate] = useLocation();
  const { activeJqlFilter, setActiveJqlFilter, allJqlFilters, setAllJqlFilters } = useFilter();
  
  const [jqlInput, setJqlInput] = useState('');
  const [nomeInput, setNomeInput] = useState('');
  const [descricaoInput, setDescricaoInput] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<JqlFilter[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('jqlFilters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        setSavedFilters(filters);
      } catch (e) {
        console.error('Erro ao carregar filtros:', e);
      }
    }
  }, []);

  // Salvar filtros no localStorage
  const saveFiltersToStorage = (filters: JqlFilter[]) => {
    localStorage.setItem('jqlFilters', JSON.stringify(filters));
    setSavedFilters(filters);
  };

  const handlePreview = async () => {
    if (!jqlInput.trim()) {
      setPreviewError('Por favor, insira um JQL válido');
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const response = await fetch('/api/trpc/dashboard.getIssuesByJql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: jqlInput.trim() }),
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar dados');
      }

      const data = await response.json();
      setPreviewData(data.result?.data?.issues || []);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Erro ao buscar dados');
      setPreviewData([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveFilter = () => {
    if (!jqlInput.trim() || !nomeInput.trim()) {
      alert('Por favor, preencha JQL e Nome');
      return;
    }

    let newFilters: JqlFilter[];

    if (editingId !== null) {
      newFilters = savedFilters.map(f =>
        f.id === editingId
          ? { ...f, jql: jqlInput, nome: nomeInput, descricao: descricaoInput }
          : f
      );
    } else {
      const newFilter: JqlFilter = {
        id: Date.now(),
        nome: nomeInput,
        jql: jqlInput,
        descricao: descricaoInput,
        isDefault: false,
      };
      newFilters = [...savedFilters, newFilter];
    }

    saveFiltersToStorage(newFilters);
    setAllJqlFilters(newFilters);
    
    setJqlInput('');
    setNomeInput('');
    setDescricaoInput('');
    setEditingId(null);
    setPreviewData([]);
  };

  const handleSelectFilter = (filter: JqlFilter) => {
    setActiveJqlFilter(filter);
  };

  const handleDeleteFilter = (id: number) => {
    // Não permitir deletar Sprint Ativa
    if (id === 0) {
      alert('Não é possível deletar o filtro padrão "Sprint Ativa"');
      return;
    }
    const newFilters = savedFilters.filter(f => f.id !== id);
    saveFiltersToStorage(newFilters);
    setAllJqlFilters(newFilters);
  };

  const handleEditFilter = (filter: JqlFilter) => {
    setJqlInput(filter.jql);
    setNomeInput(filter.nome);
    setDescricaoInput(filter.descricao || '');
    setEditingId(filter.id);
  };

  const handleCancelEdit = () => {
    setJqlInput('');
    setNomeInput('');
    setDescricaoInput('');
    setEditingId(null);
  };

  const handleSetAsDefault = (filter: JqlFilter) => {
    const newFilters = savedFilters.map(f => ({
      ...f,
      isDefault: f.id === filter.id
    }));
    saveFiltersToStorage(newFilters);
    setAllJqlFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div>
              <h1 className="text-3xl font-display text-foreground">Gerenciador de Filtros JQL</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Crie e gerencie filtros JQL personalizados para o dashboard
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Editor JQL - Coluna Esquerda (3 colunas) */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editingId ? 'Editar Filtro' : 'Novo Filtro JQL'}
                </CardTitle>
                <CardDescription>
                  {editingId ? 'Atualize os dados do filtro' : 'Crie um novo filtro personalizado para o dashboard'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Nome do Filtro */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Nome do Filtro</label>
                  <Input
                    placeholder="Ex: Sprint Ativa, Meus Bugs, Issues em QA"
                    value={nomeInput}
                    onChange={(e) => setNomeInput(e.target.value)}
                    className="font-medium"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Descrição (opcional)</label>
                  <Input
                    placeholder="Descrição breve do filtro"
                    value={descricaoInput}
                    onChange={(e) => setDescricaoInput(e.target.value)}
                  />
                </div>

                {/* JQL Editor */}
                <div>
                  <label className="block text-sm font-semibold mb-2">JQL Query</label>
                  <Textarea
                    placeholder="Ex: sprint in openSprints() AND project = REMOTEID AND status != Done"
                    value={jqlInput}
                    onChange={(e) => setJqlInput(e.target.value)}
                    rows={8}
                    className="font-mono text-sm bg-muted/50 border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Digite sua query JQL. Você pode usar qualquer sintaxe válida do Jira.
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    disabled={previewLoading || !jqlInput.trim()}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {previewLoading ? 'Buscando...' : 'Testar JQL'}
                  </Button>
                  <Button
                    onClick={handleSaveFilter}
                    disabled={!jqlInput.trim() || !nomeInput.trim()}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingId ? 'Atualizar' : 'Salvar'} Filtro
                  </Button>
                  {editingId && (
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>

                {/* Preview Error */}
                {previewError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                    ⚠️ {previewError}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview de Resultados */}
            {previewData.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Preview dos Resultados</CardTitle>
                  <CardDescription>
                    {previewData.length} issue(s) encontrada(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Chave</TableHead>
                          <TableHead>Resumo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Sprint</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 10).map((issue: any) => (
                          <TableRow key={issue.chave}>
                            <TableCell className="font-mono text-sm font-semibold">{issue.chave}</TableCell>
                            <TableCell className="text-sm">{issue.resumo}</TableCell>
                            <TableCell className="text-sm">
                              <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                                {issue.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{issue.responsavel || '-'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{issue.sprint || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {previewData.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Mostrando 10 de {previewData.length} resultados
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Filtros Salvos - Coluna Direita (2 colunas) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filtro Ativo */}
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Filtro Ativo</CardTitle>
              </CardHeader>
              <CardContent>
                {activeJqlFilter ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Nome</p>
                      <p className="font-semibold text-foreground">{activeJqlFilter.nome}</p>
                    </div>
                    {activeJqlFilter.descricao && (
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">Descrição</p>
                        <p className="text-sm text-foreground">{activeJqlFilter.descricao}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">JQL</p>
                      <p className="text-xs font-mono bg-background p-3 rounded border border-border break-words">
                        {activeJqlFilter.jql}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum filtro ativo</p>
                )}
              </CardContent>
            </Card>

            {/* Lista de Filtros Salvos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filtros Salvos</CardTitle>
                <CardDescription>
                  {savedFilters.length} filtro(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {savedFilters.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Nenhum filtro salvo ainda</p>
                ) : (
                  savedFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className={`p-3 border rounded-lg transition-all cursor-pointer ${
                        activeJqlFilter?.id === filter.id
                          ? 'bg-primary/10 border-primary shadow-sm'
                          : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => handleSelectFilter(filter)}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={activeJqlFilter?.id === filter.id}
                              onCheckedChange={() => handleSelectFilter(filter)}
                            />
                            <p className="font-medium text-sm truncate">{filter.nome}</p>
                            {filter.isDefault && (
                              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                Padrão
                              </span>
                            )}
                          </div>
                          {filter.descricao && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {filter.descricao}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSetAsDefault(filter)}
                            className="p-1.5 hover:bg-amber-100 text-amber-600 rounded transition-colors"
                            title="Marcar como padrão"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditFilter(filter)}
                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {filter.id !== 0 && (
                            <button
                              onClick={() => handleDeleteFilter(filter.id)}
                              className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
