import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostDistributionData {
  name: string;
  Orçado?: number;
  Custo: number;
  Realizado: number;
}

interface CostDistributionChartProps {
  title: string;
  description?: string;
  data: CostDistributionData[];
  className?: string;
}

export function CostDistributionChart({
  title,
  description,
  data,
  className
}: CostDistributionChartProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  const currentData = data.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getMaxValue = () => {
    const allValues = currentData.flatMap(item => [item.Custo, item.Realizado]);
    return Math.max(...allValues, 0);
  };

  const maxValue = getMaxValue();

  // Se não há dados, mostrar mensagem
  if (!data || data.length === 0) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <CardTitle className="text-base md:text-lg font-semibold">{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 hidden md:block">{description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-500 bg-red-100 border-2 border-red-300 rounded">
            <p>⚠️ Nenhum dado disponível para exibir</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden min-h-[400px]", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base md:text-lg font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 hidden md:block">{description}</p>
            )}
          </div>
          {/* Navegação: compacta no mobile */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <button
                onClick={prevPage}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 touch-manipulation"
                disabled={totalPages <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground px-1 md:px-2 whitespace-nowrap">
                {currentPage + 1} de {totalPages}
              </span>
              <button
                onClick={nextPage}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 touch-manipulation"
                disabled={totalPages <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Legenda */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-red-500"></div>
              <span className="text-gray-600">Custo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-400 to-teal-500"></div>
              <span className="text-gray-600">Realizado</span>
            </div>
          </div>

          {/* Gráfico */}
          <div className="flex justify-center items-end gap-8 h-56 bg-gray-50 rounded-lg p-4">
            {currentData.length > 0 ? (
              currentData.map((item, index) => {
                const custoHeight = maxValue > 0 ? (item.Custo / maxValue) * 100 : 0;
                const realizadoHeight = maxValue > 0 ? (item.Realizado / maxValue) * 100 : 0;
                const percentualRealizado = item.Custo > 0 ? ((item.Realizado / item.Custo) * 100).toFixed(1) : '0.0';
                
                return (
                  <div key={`${item.name}-${index}`} className="flex flex-col items-center gap-2">
                    {/* Container da dupla de barras com tooltip unificado */}
                    <div className="relative group">
                      {/* Barras */}
                      <div className="flex items-end gap-2 h-40">
                        {/* Barra Custo */}
                        <div
                          className="w-20 bg-gradient-to-t from-red-500 to-red-400 rounded-t-md transition-all duration-300 group-hover:from-red-600 group-hover:to-red-500 cursor-pointer"
                          style={{ height: `${Math.max(custoHeight, 5)}%`, minHeight: '8px' }}
                        />
                        
                        {/* Barra Realizado */}
                        <div
                          className="w-20 bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-md transition-all duration-300 group-hover:from-teal-600 group-hover:to-teal-500 cursor-pointer"
                          style={{ height: `${Math.max(realizadoHeight, 5)}%`, minHeight: '8px' }}
                        />
                      </div>
                      
                      {/* Tooltip unificado para a dupla */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        <div className="font-semibold text-center mb-2">{item.name}</div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <span>Custo: {formatCurrency(item.Custo)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-teal-400"></div>
                            <span>Realizado: {formatCurrency(item.Realizado)}</span>
                          </div>
                          <div className="text-center pt-1 border-t border-gray-600">
                            <span className="text-yellow-300 font-medium">{percentualRealizado}% Realizado</span>
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-gray-500 text-center">
                Nenhum dado para exibir nesta página
              </div>
            )}
          </div>
          
          {/* Indicadores de página */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1 pt-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-200",
                    i === currentPage ? "bg-blue-500" : "bg-gray-300 hover:bg-gray-400"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 