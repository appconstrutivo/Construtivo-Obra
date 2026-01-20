"use client";

import { useState, useCallback } from 'react';

interface PDFGenerationState {
  isGenerating: boolean;
  error: string | null;
}

export const usePDFGeneration = () => {
  const [state, setState] = useState<PDFGenerationState>({
    isGenerating: false,
    error: null
  });

  const generatePDF = useCallback(async (linkId: string, timeout: number = 5000) => {
    setState({ isGenerating: true, error: null });

    try {
      // Aguardar o elemento estar disponível
      await new Promise<void>((resolve, reject) => {
        const startTime = Date.now();
        
        const checkElement = () => {
          const linkElement = document.getElementById(linkId);
          const elapsed = Date.now() - startTime;
          
          const href = (linkElement as HTMLAnchorElement)?.href;
          console.log(`Verificando PDF (${elapsed}ms): elemento=${!!linkElement}, isAnchor=${linkElement instanceof HTMLAnchorElement}, href=${href || 'none'}`);
          
          if (linkElement && linkElement instanceof HTMLAnchorElement) {
            // Verificar se o link tem href válido
            if (linkElement.href && linkElement.href !== window.location.href && !linkElement.href.includes('blob:')) {
              console.log('PDF pronto para download:', linkElement.href);
              linkElement.click();
              resolve();
              return;
            } else if (linkElement.href && linkElement.href.includes('blob:')) {
              console.log('PDF blob encontrado:', linkElement.href);
              linkElement.click();
              resolve();
              return;
            }
          }
          
          // Verificar timeout
          if (elapsed > timeout) {
            const anchorHref = (linkElement as HTMLAnchorElement)?.href;
            console.error(`Timeout após ${elapsed}ms. Elemento: ${!!linkElement}, Tipo: ${typeof linkElement}, Href: ${anchorHref}`);
            reject(new Error(`Timeout: PDF não ficou pronto em ${timeout/1000}s. Verifique o console para mais detalhes.`));
            return;
          }
          
          // Tentar novamente após um pequeno delay
          setTimeout(checkElement, 200);
        };
        
        // Iniciar verificação após um delay inicial
        setTimeout(checkElement, 500);
      });

      setState({ isGenerating: false, error: null });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao gerar PDF';
      console.error('Erro na geração de PDF:', error);
      setState({ isGenerating: false, error: errorMessage });
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isGenerating: false, error: null });
  }, []);

  return {
    ...state,
    generatePDF,
    reset
  };
}; 