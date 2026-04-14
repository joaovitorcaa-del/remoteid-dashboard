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
import { ArrowLeft, Plus, Trash2, Save, Eye } from 'lucide-react';

interface JqlFilter {
  id: number;
  nome: string;
  jql: string;
  descricao?: string;
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
        setSavedFilters(JSON.parse(saved));
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
      // Aqui você pode chamar um endpoint tRPC para buscar dados com o JQL
      // Por enquanto, vou usar um fetch direto
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
      // Editar filtro existente
      newFilters = savedFilters.map(f =>
        f.id === editingId
          ? { ...f, jql: jqlInput, nome: nomeInput, descricao: descricaoInput }
          : f
      );
    } else {
      // Criar novo filtro
      const newFilter: JqlFilter = {
        id: Date.now(),
        nome: nomeInput,
        jql: jqlInput,
        descricao: descricaoInput,
      };
      newFilters = [...savedFilters, newFilter];
    }

    saveFiltersToStorage(newFilters);
    setAllJqlFilters(newFilters);
    
    // Limpar formulário
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
              <h1 className="text-3xl font-display text-foreground">Configuração de Filtros JQL</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie seus filtros JQL personalizados
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Criação/Edição */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? 'Editar Filtro' : 'Novo Filtro JQL'}</CardTitle>
                <CardDescription>
                  {editingId ? 'Atualize os dados do filtro' : 'Crie um novo filtro personalizado'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nome do Filtro */}
                <div>
                  <label className="block text-sm font-medium mb-2">Nome do Filtro</label>
                  <Input
                    placeholder="Ex: Sprint Ativa, Meus Bugs, etc"
                    value={nomeInput}
                    onChange={(e) => setNomeInput(e.target.value)}
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
                  <Input
                    placeholder="Descrição do filtro"
                    value={descricaoInput}
                    onChange={(e) => setDescricaoInput(e.target.value)}
                  />
                </div>

                {/* JQL */}
                <div>
                  <label className="block text-sm font-medium mb-2">JQL Query</label>
                  <Textarea
                    placeholder="Ex: sprint in openSprints() AND project = REMOTEID"
                    value={jqlInput}
                    onChange={(e) => setJqlInput(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Digite sua query JQL. Você pode usar qualquer sintaxe válida do Jira.
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2">
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    disabled={previewLoading || !jqlInput.trim()}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {previewLoading ? 'Buscando...' : 'Preview'}
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
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {previewError}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview de Resultados */}
            {previewData.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Preview dos Resultados</CardTitle>
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
                          <TableHead>Assignee</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 10).map((issue: any) => (
                          <TableRow key={issue.chave}>
                            <TableCell className="font-mono text-sm">{issue.chave}</TableCell>
                            <TableCell className="text-sm">{issue.resumo}</TableCell>
                            <TableCell className="text-sm">{issue.status}</TableCell>
                            <TableCell className="text-sm">{issue.responsavel || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {previewData.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Mostrando 10 de {previewData.length} resultados
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Filtros Salvos */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Filtros Salvos</CardTitle>
                <CardDescription>
                  {savedFilters.length} filtro(s) salvo(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedFilters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum filtro salvo ainda</p>
                ) : (
                  <div className="space-y-2">
                    {savedFilters.map((filter) => (
                      <div
                        key={filter.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          activeJqlFilter?.id === filter.id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/50 border-border hover:bg-muted'
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
                            </div>
                            {filter.descricao && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {filter.descricao}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                              {filter.jql}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditFilter(filter)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Editar"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFilter(filter.id)}
                              className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Filtro Ativo */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Filtro Ativo</CardTitle>
              </CardHeader>
              <CardContent>
                {activeJqlFilter ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{activeJqlFilter.nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">JQL</p>
                      <p className="text-xs font-mono bg-muted p-2 rounded break-words">
                        {activeJqlFilter.jql}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum filtro ativo</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
