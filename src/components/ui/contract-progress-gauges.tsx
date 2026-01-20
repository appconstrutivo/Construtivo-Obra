'use client';

import React, { useState } from 'react';

interface ContractProgressData {
  id: number;
  numero: string;
  tipo: string;
  descricao: string;
  fornecedor_nome: string;
  valor_total: number;
  valor_medido: number;
  percentual_executado: number;
}

interface ContractProgressGaugesProps {
  title: string;
  description?: string;
  data: ContractProgressData[];
  className?: string;
}

interface TooltipData {
  contract: ContractProgressData;
  x: number;
  y: number;
}

export function ContractProgressGauges({ 
  title, 
  description, 
  data, 
  className = "" 
}: ContractProgressGaugesProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  const itemsPerPage = 6; // 3 colunas x 2 linhas
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getGaugeColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981'; // green-500
    if (percentage >= 60) return '#f59e0b'; // amber-500
    if (percentage >= 40) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const handleMouseEnter = (contract: ContractProgressData, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      contract,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const GaugeChart = ({ contract }: { contract: ContractProgressData }) => {
    const percentage = Math.min(contract.percentual_executado, 100);
    const radius = 45;
    const strokeWidth = 8;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const color = getGaugeColor(percentage);

    return (
      <div 
        className="relative flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
        onMouseEnter={(e) => handleMouseEnter(contract, e)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              stroke="#e5e7eb"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Progress circle */}
            <circle
              stroke={color}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="transition-all duration-500 ease-in-out"
            />
          </svg>
          {/* Percentage text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-700">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        
        {/* Contract info */}
        <div className="mt-2 text-center">
          <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
            {contract.numero}
          </p>
          <p className="text-xs text-gray-500 truncate max-w-[120px]">
            {contract.tipo}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
            
            {/* Navegação e indicador de página */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {currentPage + 1} de {totalPages}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrevious}
                    disabled={currentPage === 0}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6"/>
                    </svg>
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages - 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Nenhuma negociação encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 min-h-[240px]">
            {currentData.map((contract) => (
              <GaugeChart key={contract.id} contract={contract} />
            ))}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white p-3 rounded-lg shadow-lg max-w-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <div className="space-y-1">
            <p className="font-semibold text-sm">{tooltip.contract.numero}</p>
            <p className="text-xs text-gray-300">{tooltip.contract.descricao}</p>
            <p className="text-xs text-gray-300">
              Fornecedor: {tooltip.contract.fornecedor_nome}
            </p>
            <div className="border-t border-gray-700 pt-2 mt-2">
              <p className="text-xs">
                <span className="text-gray-400">Valor Total:</span>{' '}
                <span className="text-white font-medium">
                  {formatCurrency(tooltip.contract.valor_total)}
                </span>
              </p>
              <p className="text-xs">
                <span className="text-gray-400">Valor Medido:</span>{' '}
                <span className="text-green-400 font-medium">
                  {formatCurrency(tooltip.contract.valor_medido)}
                </span>
              </p>
              <p className="text-xs">
                <span className="text-gray-400">Progresso:</span>{' '}
                <span className="text-blue-400 font-medium">
                  {tooltip.contract.percentual_executado.toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
          {/* Tooltip arrow */}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
          />
        </div>
      )}
    </>
  );
} 