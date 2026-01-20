'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useNotification } from '@/components/ui/client-notification-provider';
import { limparInconsistenciasItensCusto, limparInconsistenciaItemCusto } from '@/lib/supabase';

interface LimparInconsistenciasModalProps {
  isOpen: boolean;
  onClose: () => void;
  grupoId?: number;
  itemCustoId?: number;
  itemCodigo?: string;
}

export default function LimparInconsistenciasModal({
  isOpen,
  onClose,
  grupoId,
  itemCustoId,
  itemCodigo
}: LimparInconsistenciasModalProps) {
  const { showNotification } = useNotification();
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<{ limpos: number; total: number } | null>(null);

  const handleLimparGrupo = async () => {
    if (!grupoId) return;
    
    setExecutando(true);
    setResultado(null);
    
    try {
      console.log('🧹 Iniciando limpeza do grupo...');
      
      const resultado = await limparInconsistenciasItensCusto(grupoId);
      setResultado(resultado);
      
      showNotification({
        title: "Limpeza concluída!",
        message: `${resultado.limpos} de ${resultado.total} itens foram corrigidos.`,
        type: "success",
        duration: 5000
      });
      
      console.log('✅ Limpeza do grupo concluída:', resultado);
      
    } catch (error) {
      console.error('💥 Erro durante limpeza:', error);
      
      showNotification({
        title: "Erro na limpeza",
        message: "Ocorreu um erro durante a limpeza. Verifique os logs para mais detalhes.",
        type: "error",
        duration: 5000
      });
    } finally {
      setExecutando(false);
    }
  };

  const handleLimparItem = async () => {
    if (!itemCustoId) return;
    
    setExecutando(true);
    setResultado(null);
    
    try {
      console.log('🧹 Iniciando limpeza do item específico...');
      
      const resultado = await limparInconsistenciaItemCusto(itemCustoId);
      setResultado(resultado);
      
      showNotification({
        title: "Limpeza concluída!",
        message: `${resultado.limpos} de ${resultado.total} itens foram corrigidos.`,
        type: "success",
        duration: 5000
      });
      
      console.log('✅ Limpeza do item concluída:', resultado);
      
    } catch (error) {
      console.error('💥 Erro durante limpeza:', error);
      
      showNotification({
        title: "Erro na limpeza",
        message: "Ocorreu um erro durante a limpeza. Verifique os logs para mais detalhes.",
        type: "error",
        duration: 5000
      });
    } finally {
      setExecutando(false);
    }
  };

  const handleLimparSistema = async () => {
    setExecutando(true);
    setResultado(null);
    
    try {
      console.log('🧹 Iniciando limpeza de todo o sistema...');
      
      const resultado = await limparInconsistenciasItensCusto();
      setResultado(resultado);
      
      showNotification({
        title: "Limpeza concluída!",
        message: `${resultado.limpos} de ${resultado.total} itens foram corrigidos em todo o sistema.`,
        type: "success",
        duration: 5000
      });
      
      console.log('✅ Limpeza do sistema concluída:', resultado);
      
    } catch (error) {
      console.error('💥 Erro durante limpeza:', error);
      
      showNotification({
        title: "Erro na limpeza",
        message: "Ocorreu um erro durante a limpeza. Verifique os logs para mais detalhes.",
        type: "error",
        duration: 5000
      });
    } finally {
      setExecutando(false);
    }
  };

  const handleRecarregar = () => {
    window.location.reload();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Limpar Inconsistências de Dados">
      <div className="space-y-6">
        {/* Descrição do problema */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Inconsistência Detectada
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  O sistema detectou valores realizados que não correspondem aos dados reais de pedidos e medições.
                  {itemCodigo && (
                    <span className="font-semibold"> Item {itemCodigo} está com dados inconsistentes.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Opções de limpeza */}
        <div className="space-y-4">
          {itemCustoId && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Limpar Item Específico</h4>
              <p className="text-sm text-gray-600 mb-3">
                Corrigir apenas o item {itemCodigo} e outros itens do mesmo grupo.
              </p>
              <Button
                onClick={handleLimparItem}
                disabled={executando}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {executando ? '🧹 Limpando...' : '🧹 Limpar Item'}
              </Button>
            </div>
          )}

          {grupoId && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Limpar Grupo</h4>
              <p className="text-sm text-gray-600 mb-3">
                Corrigir todos os itens do grupo atual (mais rápido e seguro).
              </p>
              <Button
                onClick={handleLimparGrupo}
                disabled={executando}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {executando ? '🧹 Limpando...' : '🧹 Limpar Grupo'}
              </Button>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Limpar Todo o Sistema</h4>
            <p className="text-sm text-gray-600 mb-3">
              Corrigir todos os itens de custo do sistema (pode demorar mais).
            </p>
            <Button
              onClick={handleLimparSistema}
              disabled={executando}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {executando ? '🧹 Limpando...' : '🧹 Limpar Sistema'}
            </Button>
          </div>
        </div>

        {/* Resultado da limpeza */}
        {resultado && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Limpeza Concluída com Sucesso!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    <strong>{resultado.limpos}</strong> de <strong>{resultado.total}</strong> itens foram corrigidos.
                  </p>
                  {resultado.limpos > 0 && (
                    <p className="mt-1">
                      Recomendamos recarregar a página para ver as correções aplicadas.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ações finais */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {resultado && resultado.limpos > 0 && (
            <Button
              onClick={handleRecarregar}
              className="bg-blue-600 hover:bg-blue-700"
            >
              🔄 Recarregar Página
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
            disabled={executando}
          >
            {executando ? 'Aguarde...' : 'Fechar'}
          </Button>
        </div>

        {/* Informações adicionais */}
        <div className="text-xs text-gray-500 space-y-2">
          <p>
            <strong>O que esta função faz:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Verifica todos os pedidos de compra aprovados</li>
            <li>Verifica todas as medições aprovadas</li>
            <li>Calcula o valor realizado real</li>
            <li>Corrige valores inconsistentes automaticamente</li>
            <li>Atualiza percentuais realizados</li>
            <li>Mantém integridade dos dados financeiros</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
