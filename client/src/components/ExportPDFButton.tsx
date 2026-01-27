import React from 'react';
import { Download } from 'lucide-react';

interface ExportPDFButtonProps {
  dashboardData?: any;
  fileName?: string;
}

export function ExportPDFButton({ dashboardData, fileName = 'remoteid-dashboard' }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      console.log('Iniciando exportação de PDF via HTTP...');
      console.log('Dados do dashboard:', dashboardData);
      
      // Fazer requisição POST para o endpoint de exportação
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboardData,
          fileName,
        }),
      });

      console.log('Resposta recebida, status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      // Obter o Blob do PDF
      const blob = await response.blob();
      console.log('Blob recebido, tamanho:', blob.size);

      // Criar URL para o Blob
      const url = window.URL.createObjectURL(blob);
      console.log('URL criada:', url);

      // Criar link e simular clique
      const link = document.createElement('a');
      link.href = url;
      
      // Extrair nome do arquivo da header Content-Disposition se disponível
      const contentDisposition = response.headers.get('content-disposition');
      let downloadFileName = fileName + '.pdf';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (fileNameMatch) {
          downloadFileName = fileNameMatch[1];
        }
      }
      
      link.download = downloadFileName;
      document.body.appendChild(link);
      
      console.log('Clicando no link para download:', downloadFileName);
      link.click();
      
      // Limpar
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('Download concluído e limpeza realizada');
      }, 100);
      
      console.log('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao exportar PDF: ${errorMessage}\n\nTente novamente ou entre em contato com o suporte.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportPDF}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
      title="Exportar dashboard como PDF"
    >
      <Download className="w-4 h-4" />
      {isExporting ? 'Exportando...' : 'Exportar PDF'}
    </button>
  );
}
