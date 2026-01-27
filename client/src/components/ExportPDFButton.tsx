import React from 'react';
import { Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ExportPDFButtonProps {
  dashboardData?: any;
  fileName?: string;
}

export function ExportPDFButton({ dashboardData, fileName = 'remoteid-dashboard' }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);
  const exportMutation = trpc.export.generatePDF.useMutation();

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const result = await exportMutation.mutateAsync({
        dashboardData,
        fileName,
      });

      if (result.success && result.data) {
        // Converter base64 para Blob
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        // Criar URL temporária e fazer download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('PDF exportado com sucesso!');
      }
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
      disabled={isExporting || exportMutation.isPending}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
      title="Exportar dashboard como PDF"
    >
      <Download className="w-4 h-4" />
      {isExporting || exportMutation.isPending ? 'Exportando...' : 'Exportar PDF'}
    </button>
  );
}
