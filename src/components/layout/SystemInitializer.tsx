'use client'

/**
 * Memorial Descritivo – SystemInitializer Component
 * 
 * Objetivo: Componente responsável por inicializar sistemas automáticos do lado do cliente
 * 
 * Funções principais:
 * - Ativar sistema de validação automática na inicialização da aplicação
 * - Garantir que a inicialização aconteça apenas no lado do cliente
 * 
 * Dependências:
 * - React (hooks useEffect)
 * - @/lib/supabase (função ativarSistemaValidacaoAutomatica)
 * 
 * Fluxo:
 * 1. Componente é montado no layout principal
 * 2. useEffect executa uma única vez após montagem
 * 3. Verifica se está no lado do cliente (window !== 'undefined')
 * 4. Executa sistema de validação automática
 * 5. Loga o processo no console para debug
 * 
 * Segurança:
 * - Verificação de ambiente cliente antes de executar
 * - Não expõe dados sensíveis nos logs
 * 
 * Observações futuras:
 * - Considerar adicionar tratamento de erros
 * - Implementar retry em caso de falha na inicialização
 * - Adicionar métricas de performance da inicialização
 */

import { useEffect } from 'react'
import { ativarSistemaValidacaoAutomatica } from '@/lib/supabase'

export default function SystemInitializer() {
  useEffect(() => {
    // Ativar apenas no lado do cliente
    if (typeof window !== 'undefined') {
      console.log('🚀 Inicializando sistema de validação automática...')
      try {
        ativarSistemaValidacaoAutomatica()
      } catch (error) {
        console.error('❌ Erro ao inicializar sistema de validação:', error)
      }
    }
  }, [])

  // Componente não renderiza nada visualmente
  return null
}
