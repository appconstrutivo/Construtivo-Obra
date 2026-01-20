# Implementação do Seletor de Obras

## Visão Geral

Foi implementado um sistema de seleção de obras que permite ao usuário escolher qual obra deseja visualizar. Quando uma obra é selecionada, todos os dados exibidos no sistema são filtrados por essa obra, com exceção da tela de configurações que permanece global.

## Componentes Implementados

### 1. Contexto de Obra (`src/contexts/ObraContext.tsx`)

Contexto React que gerencia o estado global da obra selecionada:

- **`obraSelecionada`**: Obra atualmente selecionada
- **`obras`**: Lista de todas as obras disponíveis para o usuário
- **`isLoading`**: Estado de carregamento
- **`selecionarObra(obra)`**: Função para selecionar uma obra
- **`recarregarObras()`**: Função para recarregar a lista de obras

O contexto:
- Carrega automaticamente as obras quando o usuário está autenticado
- Salva a obra selecionada no `localStorage` para persistência
- Seleciona automaticamente a primeira obra se nenhuma estiver selecionada

### 2. Seletor no Header (`src/components/layout/Header.tsx`)

Seletor de obras adicionado no header do sistema:
- Exibe o nome da obra selecionada
- Dropdown com lista de todas as obras disponíveis
- Não é exibido na página de configurações (global)
- Atualiza automaticamente quando uma obra é selecionada

### 3. Dashboard Atualizado (`src/app/dashboard/page.tsx`)

O dashboard foi atualizado para:
- Filtrar todos os dados pela obra selecionada
- Exibir mensagem quando nenhuma obra está selecionada
- Recarregar dados automaticamente quando a obra selecionada muda

## Como Usar em Outras Páginas

### Exemplo Básico

```typescript
'use client';

import { useObra } from '@/contexts/ObraContext';
import { supabase } from '@/lib/supabaseClient';

export default function MinhaPage() {
  const { obraSelecionada } = useObra();

  useEffect(() => {
    if (!obraSelecionada) return;

    const carregarDados = async () => {
      const { data } = await supabase
        .from('minha_tabela')
        .select('*')
        .eq('obra_id', obraSelecionada.id); // Filtrar por obra

      // Processar dados...
    };

    carregarDados();
  }, [obraSelecionada]);

  if (!obraSelecionada) {
    return <div>Selecione uma obra para visualizar os dados</div>;
  }

  return (
    // Seu componente...
  );
}
```

### Padrão Recomendado

1. **Sempre verificar se há obra selecionada** antes de fazer queries
2. **Adicionar `.eq('obra_id', obraSelecionada.id)`** em todas as queries
3. **Recarregar dados quando a obra selecionada mudar** (usar `obraSelecionada` como dependência no `useEffect`)
4. **Exibir mensagem apropriada** quando não há obra selecionada

### Tabelas que Precisam de Filtro

As seguintes tabelas já possuem o campo `obra_id` e devem ser filtradas:

- `centros_custo`
- `grupos`
- `itens_orcamento`
- `itens_custo`
- `fornecedores`
- `negociacoes`
- `itens_negociacao`
- `medicoes`
- `itens_medicao`
- `pedidos_compra`
- `itens_pedido_compra`
- `parcelas_pagamento`
- `parcelas_pedido_compra`
- `parcelas_medicao`
- `parcelas_receber`

### Exceções

**A página de Configurações (`/configuracoes`)** é global e não deve filtrar por obra. O seletor de obras não é exibido nesta página.

## Estrutura do Banco de Dados

A tabela `obras` possui:
- `id`: ID único da obra
- `nome`: Nome da obra
- `empresa_id`: ID da empresa (multi-tenant)
- Outros campos de informações da obra

Todas as tabelas relacionadas possuem o campo `obra_id` para relacionamento.

## Persistência

A obra selecionada é salva no `localStorage` com a chave `obraSelecionadaId`, garantindo que a seleção persista entre sessões do navegador.

## Próximos Passos

Para completar a implementação, é necessário atualizar as seguintes páginas para usar o filtro de obra:

1. ✅ Dashboard - **Concluído**
2. ⏳ Controle Financeiro (`/financeiro`)
3. ⏳ Medições (`/medicoes`)
4. ⏳ Compras (`/compras`)
5. ⏳ Contas a Pagar (`/contas-a-pagar`)
6. ⏳ Contas a Receber (`/contas-a-receber`)
7. ⏳ Contratos (`/negociacoes`)
8. ⏳ Fornecedores (`/fornecedores`)

Todas essas páginas devem seguir o padrão descrito acima.
