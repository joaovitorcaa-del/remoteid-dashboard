import React from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportPDFButtonProps {
  dashboardRef: React.RefObject<HTMLDivElement | null>;
  fileName?: string;
}

export function ExportPDFButton({ dashboardRef, fileName = 'remoteid-dashboard' }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  // Função para limpar classes Tailwind e aplicar estilos computados como inline
  const prepareElementForExport = (element: HTMLElement): HTMLElement => {
    const clone = element.cloneNode(true) as HTMLElement;
    
    const processElement = (el: HTMLElement | SVGElement) => {
      // Obter estilos computados
      const computed = window.getComputedStyle(el);
      
      // Verificar se é um elemento SVG
      const isSVG = el instanceof SVGElement;
      
      // Remover classes (com tratamento especial para SVG)
      if (!isSVG && el instanceof HTMLElement) {
        el.className = '';
      } else if (isSVG && el.hasAttribute('class')) {
        el.removeAttribute('class');
      }
      
      // Aplicar estilos computados como inline
      // Cores
      if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        el.style.backgroundColor = computed.backgroundColor;
      }
      if (computed.color) {
        el.style.color = computed.color;
      }
      if (computed.borderColor) {
        el.style.borderColor = computed.borderColor;
      }
      
      // Layout
      el.style.display = computed.display;
      el.style.width = computed.width;
      el.style.height = computed.height;
      el.style.padding = computed.padding;
      el.style.margin = computed.margin;
      el.style.border = computed.border;
      el.style.borderRadius = computed.borderRadius;
      
      // Tipografia
      el.style.fontSize = computed.fontSize;
      el.style.fontWeight = computed.fontWeight;
      el.style.fontFamily = computed.fontFamily;
      el.style.lineHeight = computed.lineHeight;
      el.style.textAlign = computed.textAlign;
      
      // Flexbox
      if (computed.display === 'flex') {
        el.style.flexDirection = computed.flexDirection;
        el.style.justifyContent = computed.justifyContent;
        el.style.alignItems = computed.alignItems;
        el.style.gap = computed.gap;
      }
      
      // Grid
      if (computed.display === 'grid') {
        el.style.gridTemplateColumns = computed.gridTemplateColumns;
        el.style.gridTemplateRows = computed.gridTemplateRows;
        el.style.gap = computed.gap;
      }
      
      // Sombras e efeitos
      if (computed.boxShadow && computed.boxShadow !== 'none') {
        el.style.boxShadow = computed.boxShadow;
      }
      
      // Processar filhos recursivamente
      Array.from(el.children).forEach((child) => {
        processElement(child as HTMLElement | SVGElement);
      });
    };
    
    processElement(clone);
    return clone;
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) {
      alert('Dashboard não encontrado. Tente novamente.');
      return;
    }

    setIsExporting(true);
    try {
      const element = dashboardRef.current;
      
      // Preparar elemento para exportação (remover classes Tailwind, aplicar estilos inline)
      const clonedElement = prepareElementForExport(element);
      
      // Garantir fundo branco
      clonedElement.style.backgroundColor = '#ffffff';
      clonedElement.style.color = '#333333';
      
      // Adicionar o clone temporariamente ao DOM (necessário para html2canvas)
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = element.scrollWidth + 'px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);
      
      try {
        // Capturar o elemento como canvas com configurações otimizadas
        const canvas = await html2canvas(clonedElement, {
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          windowHeight: clonedElement.scrollHeight,
          windowWidth: clonedElement.scrollWidth,
        });

        // Remover o clone temporário
        document.body.removeChild(tempContainer);

        // Criar PDF com múltiplas páginas se necessário
        const imgWidth = 210; // A4 width em mm
        const pageHeight = 297; // A4 height em mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        const pdf = new jsPDF('p', 'mm', 'a4');
        let pageCount = 1;

        // Adicionar primeira página
        let imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Adicionar páginas adicionais se necessário
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          pageCount++;
        }

        // Salvar PDF
        const timestamp = new Date().toISOString().split('T')[0];
        pdf.save(`${fileName}-${timestamp}.pdf`);
        
        console.log(`PDF exportado com sucesso! (${pageCount} página${pageCount > 1 ? 's' : ''})`);
      } catch (canvasError) {
        // Remover o clone em caso de erro
        if (tempContainer.parentNode) {
          document.body.removeChild(tempContainer);
        }
        throw canvasError;
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
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
      title="Exportar dashboard como PDF"
    >
      <Download className="w-4 h-4" />
      {isExporting ? 'Exportando...' : 'Exportar PDF'}
    </button>
  );
}
