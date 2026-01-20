"use client";

import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
}

const PDFModal: React.FC<PDFModalProps> = ({ isOpen, onClose, pdfUrl, fileName }) => {
  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      // Buscar o blob do PDF
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      
      // Criar URL temporário
      const url = window.URL.createObjectURL(blob);
      
      // Criar link e fazer download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Limpeza
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      // Fallback para método original
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenNewTab = async () => {
    try {
      // Buscar o blob do PDF
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      
      // Criar URL temporário
      const url = window.URL.createObjectURL(blob);
      
      // Abrir em nova aba
      const newWindow = window.open(url, '_blank');
      
      // Limpar URL após um tempo
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      if (!newWindow) {
        alert('Por favor, permita pop-ups para abrir o PDF em nova aba.');
      }
    } catch (error) {
      console.error('Erro ao abrir em nova aba:', error);
      // Fallback para método original
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-75"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-[95vw] h-[95vh] max-w-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b bg-gray-50 rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-800">{fileName}</h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Baixar PDF"
            >
              <Download size={20} />
            </button>
            
            <button
              onClick={handleOpenNewTab}
              className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink size={20} />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* PDF Viewer */}
        <div className="flex-1 p-1">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0 rounded"
            title={fileName}
          />
        </div>
        
        {/* Footer */}
        <div className="p-2 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Visualização do PDF gerado</span>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFModal; 