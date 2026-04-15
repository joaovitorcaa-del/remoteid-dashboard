import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductivityDashboard from '@/components/ProductivityDashboard';
import AnalysisJqlConfigModal from '@/components/AnalysisJqlConfigModal';
import { AnalysisProvider } from '@/contexts/AnalysisContext';

export default function Analysis() {
  const [, navigate] = useLocation();

  return (
    <AnalysisProvider>
      <div className="min-h-screen bg-gray-50 p-8">
        <main className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Análise</h1>
                <p className="text-gray-600 mt-2">Visualizações avançadas de produtividade e desempenho</p>
              </div>
              <div className="flex items-center gap-2">
                <AnalysisJqlConfigModal />
                <Button onClick={() => navigate('/')} variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </div>
            </div>
          </div>

        {/* Subtelas */}
        <Tabs defaultValue="productivity" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="productivity">Dashboard de Produtividade</TabsTrigger>
            <TabsTrigger value="team">Análise de Squad</TabsTrigger>
            <TabsTrigger value="trends">Tendências e Insights</TabsTrigger>
          </TabsList>

          {/* Aba: Dashboard de Produtividade */}
          <TabsContent value="productivity">
            <ProductivityDashboard />
          </TabsContent>

          {/* Aba: Análise de Squad */}
          <TabsContent value="team">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">Análise de Squad - Em desenvolvimento</p>
            </div>
          </TabsContent>

          {/* Aba: Tendências e Insights */}
          <TabsContent value="trends">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">Tendências e Insights - Em desenvolvimento</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
    </AnalysisProvider>
  );
}
