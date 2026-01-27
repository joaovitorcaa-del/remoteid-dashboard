import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportPDFButtonProps {
  dashboardRef: React.RefObject<HTMLDivElement | null>;
  fileName?: string;
}

export function ExportPDFButton({ dashboardRef, fileName = 'remoteid-dashboard' }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;

    setIsExporting(true);
    try {
      // Capturar o elemento como imagem
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Criar PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // Largura A4 em mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Adicionar imagem ao PDF, dividindo em múltiplas páginas se necessário
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // Altura A4 em mm

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      // Download do PDF
      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`${fileName}-${timestamp}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportPDF}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
    >
      <Download className="w-4 h-4" />
      {isExporting ? 'Exportando...' : 'Exportar PDF'}
    </button>
  );
}
