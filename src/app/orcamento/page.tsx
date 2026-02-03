'use client';

/**
 * Módulo de Orçamento de Obras - Fluxo completo
 *
 * Integrado ao banco de dados (orcamentos, orcamento_grupos, orcamento_itens).
 * Fluxo típico: dados gerais → grupos e itens → BDI e resumo → revisão.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronLeft,
  FileText,
  Calculator,
  Building2,
  Check,
  ListChecks,
  Percent,
  Eye,
  X,
  Layers,
} from 'lucide-react';
import { useObra } from '@/contexts/ObraContext';
import {
  fetchOrcamentos,
  fetchOrcamentoCompleto,
  insertOrcamento,
  saveOrcamentoCompleto,
  deleteOrcamento,
  searchSinapiNaoDesonerada,
  fetchDetalhamentoComposicao,
  hasDetalhamentoCustom,
  upsertCoeficienteCustom,
  deleteDetalhamentoCustom,
  insertItemDetalhamento,
  excluirItemDetalhamento,
  searchItensDetalhamentoComposicao,
  getPrecoComposicaoCalculado,
  getPrecoSinapiComposicao,
  getPrecoItemDetalhamento,
  type OrcamentoDocumento,
  type SinapiComposicao,
  type ItemDetalhamento,
  type ItemBuscaDetalhamento,
} from '@/lib/supabase';
import { useNotification } from '@/components/ui/client-notification-provider';
import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/modal';

// Tipos do formulário (estado local)
interface ItemOrcamento {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
}

interface GrupoOrcamento {
  id: string;
  codigo: string;
  descricao: string;
  itens: ItemOrcamento[];
  subtotal: number;
}

interface DadosGerais {
  numero: string;
  obraNome: string;
  cliente: string;
  endereco: string;
  dataEmissao: string;
  dataValidade: string;
  responsavelTecnico: string;
  crea: string;
  objeto: string;
  observacoes: string;
  condicoesPagamento: string;
}

const UNIDADES = ['m²', 'm³', 'm', 'un', 'kg', 'hr', 'mes', 'lote', 'serviço', 'M2', 'UN', 'M'];

const UFS_SINAPI = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

/** Mapeia unidade da planilha SINAPI para o valor exibido no select do orçamento. */
function normalizarUnidadeSinapi(u: string): string {
  const raw = (u || '').trim();
  const v = raw.toUpperCase();
  const mapa: Record<string, string> = {
    KG: 'kg',
    M2: 'm²',
    M3: 'm³',
    M: 'm',
    MES: 'mes',
    UN: 'un',
    H: 'hr',
    HR: 'hr',
    LOTE: 'lote',
    SERVIÇO: 'serviço',
    SERVICO: 'serviço',
  };
  if (mapa[v]) return mapa[v];
  if (v === 'KG' || raw.toLowerCase() === 'kg') return 'kg';
  if (v === 'MES' || raw.toLowerCase() === 'mes') return 'mes';
  return raw || 'un';
}

const GRUPOS_PADRAO = [
  { codigo: '01', descricao: 'Serviços Preliminares' },
  { codigo: '02', descricao: 'Fundações e Estrutura de Concreto' },
  { codigo: '03', descricao: 'Estrutura Metálica e Alvenaria' },
  { codigo: '04', descricao: 'Cobertura e Impermeabilização' },
  { codigo: '05', descricao: 'Instalações Elétricas e Hidrossanitárias' },
  { codigo: '06', descricao: 'Acabamentos e Revestimentos' },
  { codigo: '07', descricao: 'Pavimentação e Paisagismo' },
  { codigo: '08', descricao: 'Serviços Complementares' },
];

function gerarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function OrcamentoPage() {
  const { obraSelecionada } = useObra();
  const { showNotification } = useNotification();

  const [orcamentos, setOrcamentos] = useState<OrcamentoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<'lista' | 'wizard'>('lista');
  const [orcamentoAtual, setOrcamentoAtual] = useState<OrcamentoDocumento | null>(null);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [orcamentoParaExcluir, setOrcamentoParaExcluir] = useState<OrcamentoDocumento | null>(null);
  const [etapaAtual, setEtapaAtual] = useState(1);
  const totalEtapas = 4;

  const [dadosGerais, setDadosGerais] = useState<DadosGerais>({
    numero: '',
    obraNome: obraSelecionada?.nome ?? '',
    cliente: '',
    endereco: obraSelecionada?.endereco ?? '',
    dataEmissao: new Date().toISOString().slice(0, 10),
    dataValidade: '',
    responsavelTecnico: obraSelecionada?.responsavel_tecnico ?? '',
    crea: '',
    objeto: '',
    observacoes: '',
    condicoesPagamento: 'Conforme cronograma de medições mensais.',
  });

  const [grupos, setGrupos] = useState<GrupoOrcamento[]>(
    GRUPOS_PADRAO.map((g) => ({
      id: gerarId(),
      codigo: g.codigo,
      descricao: g.descricao,
      itens: [],
      subtotal: 0,
    }))
  );

  const [percentualBDI, setPercentualBDI] = useState(15);

  const [ufPrecoSINAPI, setUfPrecoSINAPI] = useState('SP');
  const [sinapiSearch, setSinapiSearch] = useState<{
    grupoId: string | null;
    itemId: string | null;
    field: 'codigo' | 'descricao' | null;
    term: string;
    results: SinapiComposicao[];
    loading: boolean;
    open: boolean;
  }>({
    grupoId: null,
    itemId: null,
    field: null,
    term: '',
    results: [],
    loading: false,
    open: false,
  });
  const sinapiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detalhamentoModal, setDetalhamentoModal] = useState<{
    open: boolean;
    codigo: string;
    descricao: string;
    grupoId: string;
    itemId: string;
    loading: boolean;
    hasCustom: boolean;
    itens: ItemDetalhamento[];
    /** Preço unitário por codigo_item (para exibir custo parcial e soma analítica). */
    precosPorItem: Record<string, number>;
  }>({
    open: false,
    codigo: '',
    descricao: '',
    grupoId: '',
    itemId: '',
    loading: false,
    hasCustom: false,
    itens: [],
    precosPorItem: {},
  });

  const [composicoesComDetalhamentoCustom, setComposicoesComDetalhamentoCustom] = useState<Set<string>>(new Set());

  const [buscaItemDetalhamento, setBuscaItemDetalhamento] = useState<{
    term: string;
    by: 'codigo' | 'descricao';
    results: SinapiComposicao[];
    loading: boolean;
    open: boolean;
  }>({ term: '', by: 'codigo', results: [], loading: false, open: false });
  const buscaItemDetalhamentoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [inserirItemDetalhamentoBusca, setInserirItemDetalhamentoBusca] = useState<{
    term: string;
    results: ItemBuscaDetalhamento[];
    loading: boolean;
    open: boolean;
  }>({ term: '', results: [], loading: false, open: false });
  const inserirItemDetalhamentoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregarOrcamentos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrcamentos(obraSelecionada?.id ?? undefined);
      setOrcamentos(data);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      showNotification({
        title: 'Erro',
        message: 'Não foi possível carregar os orçamentos.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [obraSelecionada?.id, showNotification]);

  useEffect(() => {
    carregarOrcamentos();
  }, [carregarOrcamentos]);

  const atualizarObraNoForm = useCallback(() => {
    if (obraSelecionada) {
      setDadosGerais((prev) => ({
        ...prev,
        obraNome: obraSelecionada.nome ?? prev.obraNome,
        endereco: obraSelecionada.endereco ?? prev.endereco,
        responsavelTecnico: obraSelecionada.responsavel_tecnico ?? prev.responsavelTecnico,
      }));
    }
  }, [obraSelecionada]);

  const totalDireto = grupos.reduce(
    (s, g) => s + g.itens.reduce((si, i) => si + i.total, 0),
    0
  );
  const valorBDI = totalDireto * (percentualBDI / 100);
  const totalComBDI = totalDireto + valorBDI;

  const adicionarItem = (grupoId: string) => {
    setGrupos((prev) =>
      prev.map((g) =>
        g.id === grupoId
          ? {
            ...g,
            itens: [
              ...g.itens,
              {
                id: gerarId(),
                codigo: '',
                descricao: '',
                unidade: 'un',
                quantidade: 0,
                precoUnitario: 0,
                total: 0,
              },
            ],
          }
          : g
      )
    );
  };

  const atualizarItem = (
    grupoId: string,
    itemId: string,
    campo: keyof ItemOrcamento,
    valor: string | number
  ) => {
    setGrupos((prev) =>
      prev.map((g) => {
        if (g.id !== grupoId) return g;
        const itens = g.itens.map((i) => {
          if (i.id !== itemId) return i;
          const atualizado = { ...i, [campo]: valor };
          if (campo === 'quantidade' || campo === 'precoUnitario') {
            atualizado.total =
              Number(atualizado.quantidade) * Number(atualizado.precoUnitario);
          }
          return atualizado;
        });
        const subtotal = itens.reduce((s, i) => s + i.total, 0);
        return { ...g, itens, subtotal };
      })
    );
  };

  const removerItem = (grupoId: string, itemId: string) => {
    setGrupos((prev) =>
      prev.map((g) => {
        if (g.id !== grupoId) return g;
        const novosItens = g.itens.filter((i) => i.id !== itemId);
        const subtotal = novosItens.reduce((s, i) => s + i.total, 0);
        return { ...g, itens: novosItens, subtotal };
      })
    );
  };

  const removerGrupo = (grupoId: string) => {
    setGrupos((prev) => prev.filter((g) => g.id !== grupoId));
  };

  const runSinapiSearch = useCallback(
    async (grupoId: string, itemId: string, field: 'codigo' | 'descricao', term: string) => {
      if (!term.trim()) {
        setSinapiSearch((s) => ({ ...s, results: [], loading: false, open: false }));
        return;
      }
      setSinapiSearch((s) => ({ ...s, loading: true }));
      const results = await searchSinapiNaoDesonerada(
        term,
        ufPrecoSINAPI,
        field,
        20
      );
      setSinapiSearch((s) =>
        s.grupoId === grupoId && s.itemId === itemId
          ? { ...s, results, loading: false }
          : s
      );
    },
    [ufPrecoSINAPI]
  );

  const handleSinapiCodigoChange = useCallback(
    (grupoId: string, itemId: string, value: string) => {
      atualizarItem(grupoId, itemId, 'codigo', value);
      if (sinapiDebounceRef.current) clearTimeout(sinapiDebounceRef.current);
      setSinapiSearch({
        grupoId,
        itemId,
        field: 'codigo',
        term: value,
        results: [],
        loading: !!value.trim(),
        open: true,
      });
      if (!value.trim()) return;
      sinapiDebounceRef.current = setTimeout(() => {
        runSinapiSearch(grupoId, itemId, 'codigo', value);
        sinapiDebounceRef.current = null;
      }, 300);
    },
    [runSinapiSearch]
  );

  const handleSinapiDescricaoChange = useCallback(
    (grupoId: string, itemId: string, value: string) => {
      atualizarItem(grupoId, itemId, 'descricao', value);
      if (sinapiDebounceRef.current) clearTimeout(sinapiDebounceRef.current);
      setSinapiSearch({
        grupoId,
        itemId,
        field: 'descricao',
        term: value,
        results: [],
        loading: !!value.trim(),
        open: true,
      });
      if (!value.trim()) return;
      sinapiDebounceRef.current = setTimeout(() => {
        runSinapiSearch(grupoId, itemId, 'descricao', value);
        sinapiDebounceRef.current = null;
      }, 300);
    },
    [runSinapiSearch]
  );

  const abrirDetalhamento = useCallback(async (grupoId: string, item: ItemOrcamento) => {
    if (!item.codigo?.trim()) return;
    setInserirItemDetalhamentoBusca({ term: '', results: [], loading: false, open: false });
    setDetalhamentoModal((s) => ({
      ...s,
      open: true,
      codigo: item.codigo,
      descricao: item.descricao,
      grupoId,
      itemId: item.id,
      loading: true,
      hasCustom: false,
      itens: [],
      precosPorItem: {},
    }));
    const [itens, hasCustom] = await Promise.all([
      fetchDetalhamentoComposicao(item.codigo, ufPrecoSINAPI),
      hasDetalhamentoCustom(item.codigo, ufPrecoSINAPI),
    ]);
    const precos = await Promise.all(
      itens.map((i) => getPrecoItemDetalhamento(i.tipo_item, i.codigo_item, ufPrecoSINAPI))
    );
    const precosPorItem: Record<string, number> = {};
    itens.forEach((i, idx) => {
      precosPorItem[i.codigo_item] = precos[idx] ?? 0;
    });
    setDetalhamentoModal((s) => ({ ...s, loading: false, itens, hasCustom, precosPorItem }));
    if (hasCustom) {
      setComposicoesComDetalhamentoCustom((prev) => new Set(prev).add(item.codigo));
      const precoCalculado = await getPrecoComposicaoCalculado(item.codigo, ufPrecoSINAPI);
      if (precoCalculado != null) {
        atualizarItem(grupoId, item.id, 'precoUnitario', precoCalculado);
      }
    }
  }, [ufPrecoSINAPI]);

  const fecharDetalhamento = useCallback(() => {
    setDetalhamentoModal((s) => ({ ...s, open: false }));
  }, []);

  const atualizarCoeficienteNoModal = useCallback((item: ItemDetalhamento, coeficiente: number) => {
    setDetalhamentoModal((s) => ({
      ...s,
      itens: s.itens.map((i) =>
        i.codigo_item === item.codigo_item &&
          i.is_from_ref === item.is_from_ref &&
          i.id === item.id &&
          (i.id_custom ?? 0) === (item.id_custom ?? 0)
          ? { ...i, coeficiente }
          : i
      ),
    }));
  }, []);

  const salvarDetalhamento = useCallback(async () => {
    const { codigo, grupoId, itemId, itens } = detalhamentoModal;
    if (!codigo?.trim() || !grupoId || !itemId) return;
    setDetalhamentoModal((s) => ({ ...s, loading: true }));
    let ok = true;
    for (const i of itens) {
      const success = await upsertCoeficienteCustom(codigo, ufPrecoSINAPI, i.codigo_item, i.coeficiente);
      if (!success) ok = false;
    }
    setDetalhamentoModal((s) => ({ ...s, loading: false }));
    if (!ok) {
      showNotification({ title: 'Erro', message: 'Não foi possível salvar alguns coeficientes.', type: 'error' });
      return;
    }
    const precoCalculado = await getPrecoComposicaoCalculado(codigo, ufPrecoSINAPI);
    if (precoCalculado != null) {
      atualizarItem(grupoId, itemId, 'precoUnitario', precoCalculado);
    }
    setComposicoesComDetalhamentoCustom((prev) => new Set(prev).add(codigo));
    setDetalhamentoModal((s) => ({ ...s, hasCustom: true }));
    showNotification({ title: 'Salvo', message: 'Coeficientes atualizados. Preço da composição recalculado.', type: 'success' });
  }, [detalhamentoModal, ufPrecoSINAPI, showNotification]);

  const restaurarDetalhamento = useCallback(async () => {
    const { codigo, grupoId, itemId } = detalhamentoModal;
    if (!codigo?.trim() || !grupoId || !itemId) return;
    setDetalhamentoModal((s) => ({ ...s, loading: true }));
    const ok = await deleteDetalhamentoCustom(codigo, ufPrecoSINAPI);
    if (!ok) {
      setDetalhamentoModal((s) => ({ ...s, loading: false }));
      showNotification({ title: 'Erro', message: 'Não foi possível restaurar.', type: 'error' });
      return;
    }
    const itensRef = await fetchDetalhamentoComposicao(codigo);
    const precos = await Promise.all(
      itensRef.map((i) => getPrecoItemDetalhamento(i.tipo_item, i.codigo_item, ufPrecoSINAPI))
    );
    const precosPorItem: Record<string, number> = {};
    itensRef.forEach((i, idx) => {
      precosPorItem[i.codigo_item] = precos[idx] ?? 0;
    });
    const precoSinapi = await getPrecoSinapiComposicao(codigo, ufPrecoSINAPI);
    if (precoSinapi != null) {
      atualizarItem(grupoId, itemId, 'precoUnitario', precoSinapi);
    }
    setComposicoesComDetalhamentoCustom((prev) => {
      const next = new Set(prev);
      next.delete(codigo);
      return next;
    });
    setDetalhamentoModal((s) => ({ ...s, loading: false, itens: itensRef, hasCustom: false, precosPorItem }));
    showNotification({ title: 'Restaurado', message: 'Valores de referência restaurados.', type: 'success' });
  }, [detalhamentoModal, ufPrecoSINAPI, showNotification]);

  const adicionarItemNoDetalhamento = useCallback(
    async (item: ItemBuscaDetalhamento) => {
      const { codigo, grupoId, itemId } = detalhamentoModal;
      if (!codigo?.trim() || !ufPrecoSINAPI) return;
      setDetalhamentoModal((s) => ({ ...s, loading: true }));
      const ok = await insertItemDetalhamento(
        codigo,
        ufPrecoSINAPI,
        item.codigo_item,
        item.tipo_item,
        item.descricao,
        item.unidade_medida,
        0
      );
      if (!ok) {
        setDetalhamentoModal((s) => ({ ...s, loading: false }));
        showNotification({ title: 'Erro', message: 'Não foi possível inserir o item.', type: 'error' });
        return;
      }
      const newItens = await fetchDetalhamentoComposicao(codigo, ufPrecoSINAPI);
      const precos = await Promise.all(
        newItens.map((i) => getPrecoItemDetalhamento(i.tipo_item, i.codigo_item, ufPrecoSINAPI))
      );
      const precosPorItem: Record<string, number> = { ...detalhamentoModal.precosPorItem };
      newItens.forEach((i, idx) => {
        precosPorItem[i.codigo_item] = precos[idx] ?? 0;
      });
      const precoCalculado = await getPrecoComposicaoCalculado(codigo, ufPrecoSINAPI);
      if (precoCalculado != null && grupoId && itemId) {
        atualizarItem(grupoId, itemId, 'precoUnitario', precoCalculado);
      }
      setComposicoesComDetalhamentoCustom((prev) => new Set(prev).add(codigo));
      setDetalhamentoModal((s) => ({ ...s, loading: false, itens: newItens, hasCustom: true, precosPorItem }));
      setInserirItemDetalhamentoBusca({ term: '', results: [], loading: false, open: false });
      showNotification({ title: 'Item adicionado', message: 'Inclua o coeficiente e salve as alterações.', type: 'success' });
    },
    [detalhamentoModal, ufPrecoSINAPI, showNotification]
  );

  const excluirItemDoDetalhamento = useCallback(
    async (item: ItemDetalhamento) => {
      const { codigo, grupoId, itemId } = detalhamentoModal;
      if (!codigo?.trim() || !ufPrecoSINAPI) return;
      setDetalhamentoModal((s) => ({ ...s, loading: true }));
      const ok = await excluirItemDetalhamento(item, codigo, ufPrecoSINAPI);
      if (!ok) {
        setDetalhamentoModal((s) => ({ ...s, loading: false }));
        showNotification({ title: 'Erro', message: 'Não foi possível excluir o item.', type: 'error' });
        return;
      }
      const newItens = await fetchDetalhamentoComposicao(codigo, ufPrecoSINAPI);
      const precos = await Promise.all(
        newItens.map((i) => getPrecoItemDetalhamento(i.tipo_item, i.codigo_item, ufPrecoSINAPI))
      );
      const precosPorItem: Record<string, number> = {};
      newItens.forEach((i, idx) => {
        precosPorItem[i.codigo_item] = precos[idx] ?? 0;
      });
      const precoCalculado = await getPrecoComposicaoCalculado(codigo, ufPrecoSINAPI);
      if (precoCalculado != null && grupoId && itemId) {
        atualizarItem(grupoId, itemId, 'precoUnitario', precoCalculado);
      }
      setDetalhamentoModal((s) => ({ ...s, loading: false, itens: newItens, hasCustom: newItens.length > 0, precosPorItem }));
      showNotification({ title: 'Item excluído', message: 'Salve as alterações para confirmar.', type: 'success' });
    },
    [detalhamentoModal, ufPrecoSINAPI, showNotification]
  );

  useEffect(() => {
    if (!detalhamentoModal.open) return;
    const term = inserirItemDetalhamentoBusca.term.trim();
    if (!term) {
      setInserirItemDetalhamentoBusca((s) => ({ ...s, results: [], open: false }));
      return;
    }
    if (inserirItemDetalhamentoDebounce.current) clearTimeout(inserirItemDetalhamentoDebounce.current);
    inserirItemDetalhamentoDebounce.current = setTimeout(async () => {
      setInserirItemDetalhamentoBusca((s) => ({ ...s, loading: true }));
      const results = await searchItensDetalhamentoComposicao(term, 50);
      setInserirItemDetalhamentoBusca((s) => ({ ...s, results, loading: false, open: true }));
    }, 300);
    return () => {
      if (inserirItemDetalhamentoDebounce.current) clearTimeout(inserirItemDetalhamentoDebounce.current);
    };
  }, [detalhamentoModal.open, inserirItemDetalhamentoBusca.term]);

  const handleSelectSinapi = useCallback(
    (grupoId: string, itemId: string, comp: SinapiComposicao) => {
      setGrupos((prev) =>
        prev.map((g) => {
          if (g.id !== grupoId) return g;
          const itens = g.itens.map((i) => {
            if (i.id !== itemId) return i;
            const preco = comp.preco ?? 0;
            return {
              ...i,
              codigo: comp.codigo_composicao,
              descricao: comp.descricao,
              unidade: normalizarUnidadeSinapi(comp.unidade_medida),
              precoUnitario: preco,
              total: i.quantidade * preco,
            };
          });
          const subtotal = itens.reduce((s, i) => s + i.total, 0);
          return { ...g, itens, subtotal };
        })
      );
      setSinapiSearch((s) => ({ ...s, open: false, results: [] }));
    },
    []
  );

  const adicionarGrupo = () => {
    setGrupos((prev) => [
      ...prev,
      {
        id: gerarId(),
        codigo: String(prev.length + 1).padStart(2, '0'),
        descricao: 'Novo grupo',
        itens: [],
        subtotal: 0,
      },
    ]);
  };

  const salvarOrcamento = async () => {
    const gruposComTotais = grupos.map((g) => {
      const itens = g.itens.map((i) => ({
        ...i,
        total: i.quantidade * i.precoUnitario,
      }));
      const subtotal = itens.reduce((s, i) => s + i.total, 0);
      return { ...g, itens, subtotal };
    });
    const total = gruposComTotais.reduce((s, g) => s + g.subtotal, 0);
    const valorBDI = total * (percentualBDI / 100);
    const totalComBDI = total + valorBDI;

    setSalvando(true);
    try {
      const payloadGrupos = gruposComTotais.map((g, idx) => ({
        codigo: g.codigo,
        descricao: g.descricao,
        ordem: idx,
        itens: g.itens.map((i) => ({
          codigo: i.codigo || undefined,
          descricao: i.descricao,
          unidade: i.unidade,
          quantidade: i.quantidade,
          preco_unitario: i.precoUnitario,
        })),
      }));

      if (orcamentoAtual) {
        await saveOrcamentoCompleto(orcamentoAtual.id, {
          obra_id: obraSelecionada?.id ?? null,
          numero: dadosGerais.numero || undefined,
          obra_nome: dadosGerais.obraNome || undefined,
          cliente: dadosGerais.cliente || undefined,
          endereco: dadosGerais.endereco || undefined,
          data_emissao: dadosGerais.dataEmissao,
          data_validade: dadosGerais.dataValidade || null,
          responsavel_tecnico: dadosGerais.responsavelTecnico || undefined,
          crea: dadosGerais.crea || undefined,
          objeto: dadosGerais.objeto || undefined,
          observacoes: dadosGerais.observacoes || undefined,
          condicoes_pagamento: dadosGerais.condicoesPagamento || undefined,
          percentual_bdi: percentualBDI,
          total_direto: total,
          valor_bdi: valorBDI,
          total_com_bdi: totalComBDI,
        }, payloadGrupos);
        showNotification({
          title: 'Sucesso',
          message: 'Orçamento atualizado com sucesso.',
          type: 'success',
        });
      } else {
        await insertOrcamento(
          {
            obra_id: obraSelecionada?.id ?? null,
            numero: dadosGerais.numero || undefined,
            obra_nome: dadosGerais.obraNome || undefined,
            cliente: dadosGerais.cliente || undefined,
            endereco: dadosGerais.endereco || undefined,
            data_emissao: dadosGerais.dataEmissao,
            data_validade: dadosGerais.dataValidade || null,
            responsavel_tecnico: dadosGerais.responsavelTecnico || undefined,
            crea: dadosGerais.crea || undefined,
            objeto: dadosGerais.objeto || undefined,
            observacoes: dadosGerais.observacoes || undefined,
            condicoes_pagamento: dadosGerais.condicoesPagamento || undefined,
            percentual_bdi: percentualBDI,
            total_direto: total,
            valor_bdi: valorBDI,
            total_com_bdi: totalComBDI,
          },
          payloadGrupos
        );
        showNotification({
          title: 'Sucesso',
          message: 'Orçamento criado com sucesso.',
          type: 'success',
        });
      }
      await carregarOrcamentos();
      setModoEdicao('lista');
      setOrcamentoAtual(null);
      reiniciarFormulario();
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      showNotification({
        title: 'Erro',
        message: 'Não foi possível salvar o orçamento. Tente novamente.',
        type: 'error',
      });
    } finally {
      setSalvando(false);
    }
  };

  const reiniciarFormulario = () => {
    setDadosGerais({
      numero: '',
      obraNome: obraSelecionada?.nome ?? '',
      cliente: '',
      endereco: obraSelecionada?.endereco ?? '',
      dataEmissao: new Date().toISOString().slice(0, 10),
      dataValidade: '',
      responsavelTecnico: obraSelecionada?.responsavel_tecnico ?? '',
      crea: '',
      objeto: '',
      observacoes: '',
      condicoesPagamento: 'Conforme cronograma de medições mensais.',
    });
    setGrupos(
      GRUPOS_PADRAO.map((g) => ({
        id: gerarId(),
        codigo: g.codigo,
        descricao: g.descricao,
        itens: [],
        subtotal: 0,
      }))
    );
    setPercentualBDI(15);
    setEtapaAtual(1);
    atualizarObraNoForm();
  };

  const novoOrcamento = () => {
    reiniciarFormulario();
    setOrcamentoAtual(null);
    setModoEdicao('wizard');
    setEtapaAtual(1);
  };

  const editarOrcamento = async (orc: OrcamentoDocumento) => {
    setLoading(true);
    try {
      const completo = await fetchOrcamentoCompleto(orc.id);
      if (!completo) {
        showNotification({
          title: 'Erro',
          message: 'Não foi possível carregar o orçamento.',
          type: 'error',
        });
        return;
      }
      const { orcamento, grupos: grps, itens: itensAll } = completo;
      setOrcamentoAtual(orc);

      setDadosGerais({
        numero: orcamento.numero ?? '',
        obraNome: orcamento.obra_nome ?? '',
        cliente: orcamento.cliente ?? '',
        endereco: orcamento.endereco ?? '',
        dataEmissao: orcamento.data_emissao || '',
        dataValidade: orcamento.data_validade ?? '',
        responsavelTecnico: orcamento.responsavel_tecnico ?? '',
        crea: orcamento.crea ?? '',
        objeto: orcamento.objeto ?? '',
        observacoes: orcamento.observacoes ?? '',
        condicoesPagamento: orcamento.condicoes_pagamento ?? 'Conforme cronograma de medições mensais.',
      });

      const gruposComItens = grps
        .sort((a, b) => a.ordem - b.ordem)
        .map((g) => {
          const itensDoGrupo = itensAll
            .filter((i) => i.orcamento_grupo_id === g.id)
            .map((i) => ({
              id: gerarId(),
              codigo: i.codigo ?? '',
              descricao: i.descricao,
              unidade: i.unidade,
              quantidade: i.quantidade,
              precoUnitario: i.preco_unitario,
              total: i.total,
            }));
          return {
            id: gerarId(),
            codigo: g.codigo,
            descricao: g.descricao,
            itens: itensDoGrupo,
            subtotal: g.subtotal ?? 0,
          };
        });
      setGrupos(gruposComItens.length > 0 ? gruposComItens : GRUPOS_PADRAO.map((g) => ({
        id: gerarId(),
        codigo: g.codigo,
        descricao: g.descricao,
        itens: [],
        subtotal: 0,
      })));
      setPercentualBDI(orcamento.percentual_bdi ?? 15);
      setModoEdicao('wizard');
      setEtapaAtual(1);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      showNotification({
        title: 'Erro',
        message: 'Não foi possível carregar o orçamento para edição.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirModalExcluir = (orc: OrcamentoDocumento) => {
    setOrcamentoParaExcluir(orc);
    setModalExcluirAberto(true);
  };

  const handleExcluirOrcamento = async () => {
    if (!orcamentoParaExcluir) return;
    try {
      await deleteOrcamento(orcamentoParaExcluir.id);
      showNotification({
        title: 'Sucesso',
        message: 'Orçamento excluído com sucesso.',
        type: 'success',
      });
      setModalExcluirAberto(false);
      setOrcamentoParaExcluir(null);
      if (orcamentoAtual?.id === orcamentoParaExcluir.id) {
        setModoEdicao('lista');
        setOrcamentoAtual(null);
      }
      await carregarOrcamentos();
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      showNotification({
        title: 'Erro',
        message: 'Não foi possível excluir o orçamento.',
        type: 'error',
      });
    }
  };

  const cancelar = () => {
    setModoEdicao('lista');
    setOrcamentoAtual(null);
    reiniciarFormulario();
  };

  const avancarEtapa = () => {
    if (etapaAtual < totalEtapas) setEtapaAtual((e) => e + 1);
  };

  const voltarEtapa = () => {
    if (etapaAtual > 1) setEtapaAtual((e) => e - 1);
  };

  // Lista de orçamentos
  if (modoEdicao === 'lista') {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-8 h-8 text-primary" />
              Orçamento de Obras
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Documentos de orçamento integrados ao sistema
            </p>
          </div>
          <button
            onClick={novoOrcamento}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus size={18} />
            Novo Orçamento
          </button>
        </div>

        {obraSelecionada && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Obra selecionada: <strong>{obraSelecionada.nome}</strong>
            {obraSelecionada.endereco && ` – ${obraSelecionada.endereco}`}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : orcamentos.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Nenhum orçamento criado
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Crie seu primeiro orçamento para a obra. O fluxo inclui dados
              gerais, grupos de serviços, itens com quantidades e preços, BDI e
              resumo.
            </p>
            <button
              onClick={novoOrcamento}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors font-medium"
            >
              <Plus size={20} />
              Criar Orçamento
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Nº
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Obra
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orcamentos.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{o.numero || '-'}</td>
                    <td className="px-4 py-3">{o.obra_nome || '-'}</td>
                    <td className="px-4 py-3">{o.cliente || '-'}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatarMoeda(o.total_com_bdi)}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => editarOrcamento(o)}
                        className="text-amber-600 hover:text-amber-800"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => abrirModalExcluir(o)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmacaoModal
          isOpen={modalExcluirAberto}
          onClose={() => {
            setModalExcluirAberto(false);
            setOrcamentoParaExcluir(null);
          }}
          onConfirm={handleExcluirOrcamento}
          titulo="Excluir Orçamento"
          mensagem={
            orcamentoParaExcluir
              ? `Tem certeza que deseja excluir o orçamento "${orcamentoParaExcluir.numero || orcamentoParaExcluir.obra_nome || 'sem número'}"? Esta ação não pode ser desfeita.`
              : ''
          }
          confirmButtonText="Excluir"
          cancelButtonText="Cancelar"
        />
      </main>
    );
  }

  // Wizard de criação/edição
  const etapas = [
    { num: 1, titulo: 'Dados Gerais', icon: FileText },
    { num: 2, titulo: 'Grupos e Itens', icon: ListChecks },
    { num: 3, titulo: 'BDI e Resumo', icon: Percent },
    { num: 4, titulo: 'Revisão', icon: Eye },
  ];

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-8 h-8 text-primary" />
            {orcamentoAtual ? 'Editar' : 'Novo'} Orçamento
          </h1>
          <button
            onClick={cancelar}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <X size={18} />
            Cancelar
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {etapas.map((e, i) => (
            <div key={e.num} className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEtapaAtual(e.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${etapaAtual === e.num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <e.icon size={16} />
                {e.titulo}
              </button>
              {i < etapas.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>

        {/* Etapa 1: Dados Gerais */}
        {etapaAtual === 1 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 size={20} />
              Dados Gerais do Orçamento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Orçamento
                </label>
                <input
                  type="text"
                  value={dadosGerais.numero}
                  onChange={(e) =>
                    setDadosGerais((p) => ({ ...p, numero: e.target.value }))
                  }
                  placeholder="Ex: ORC-2025-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Obra
                </label>
                <input
                  type="text"
                  value={dadosGerais.obraNome}
                  onChange={(e) =>
                    setDadosGerais((p) => ({ ...p, obraNome: e.target.value }))
                  }
                  placeholder="Nome da obra"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente / Empreendedor
                </label>
                <input
                  type="text"
                  value={dadosGerais.cliente}
                  onChange={(e) =>
                    setDadosGerais((p) => ({ ...p, cliente: e.target.value }))
                  }
                  placeholder="Nome do cliente"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={dadosGerais.endereco}
                  onChange={(e) =>
                    setDadosGerais((p) => ({ ...p, endereco: e.target.value }))
                  }
                  placeholder="Endereço da obra"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Emissão
                </label>
                <input
                  type="date"
                  value={dadosGerais.dataEmissao}
                  onChange={(e) =>
                    setDadosGerais((p) => ({
                      ...p,
                      dataEmissao: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validade (até)
                </label>
                <input
                  type="date"
                  value={dadosGerais.dataValidade}
                  onChange={(e) =>
                    setDadosGerais((p) => ({
                      ...p,
                      dataValidade: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsável Técnico
                </label>
                <input
                  type="text"
                  value={dadosGerais.responsavelTecnico}
                  onChange={(e) =>
                    setDadosGerais((p) => ({
                      ...p,
                      responsavelTecnico: e.target.value,
                    }))
                  }
                  placeholder="Nome do responsável"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CREA
                </label>
                <input
                  type="text"
                  value={dadosGerais.crea}
                  onChange={(e) =>
                    setDadosGerais((p) => ({ ...p, crea: e.target.value }))
                  }
                  placeholder="Nº CREA"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objeto / Descrição da Obra
              </label>
              <textarea
                value={dadosGerais.objeto}
                onChange={(e) =>
                  setDadosGerais((p) => ({ ...p, objeto: e.target.value }))
                }
                placeholder="Descrição do escopo"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        )}

        {/* Etapa 2: Grupos e Itens */}
        {etapaAtual === 2 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListChecks size={20} />
              Grupos e Itens do Orçamento
            </h2>
            <p className="text-sm text-gray-600">
              Adicione itens em cada grupo. Código, descrição, unidade,
              quantidade e preço unitário.
            </p>
            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                UF para preço SINAPI:
              </label>
              <select
                value={ufPrecoSINAPI}
                onChange={(e) => setUfPrecoSINAPI(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {UFS_SINAPI.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500">
                Busque por código ou descrição nos campos abaixo; o preço será da UF selecionada.
              </span>
            </div>

            {grupos.map((grupo) => (
              <div
                key={grupo.id}
                className="border rounded-lg overflow-visible"
              >
                <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={grupo.codigo}
                      onChange={(e) =>
                        setGrupos((p) =>
                          p.map((g) =>
                            g.id === grupo.id
                              ? { ...g, codigo: e.target.value }
                              : g
                          )
                        )
                      }
                      className="w-16 border rounded px-2 py-1 text-sm font-medium"
                    />
                    <input
                      type="text"
                      value={grupo.descricao}
                      onChange={(e) =>
                        setGrupos((p) =>
                          p.map((g) =>
                            g.id === grupo.id
                              ? { ...g, descricao: e.target.value }
                              : g
                          )
                        )
                      }
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      placeholder="Descrição do grupo"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">
                      {formatarMoeda(
                        grupo.itens.reduce((s, i) => s + i.total, 0)
                      )}
                    </span>
                    <button
                      onClick={() => removerGrupo(grupo.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remover grupo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">Código</th>
                        <th className="pb-2">Descrição</th>
                        <th className="pb-2 w-20">Un.</th>
                        <th className="pb-2 w-24">Qtd</th>
                        <th className="pb-2 w-28">Preço Unit.</th>
                        <th className="pb-2 w-28">Total</th>
                        <th className="pb-2 w-10" title="Detalhamento"></th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.itens.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-2 relative">
                            <input
                              type="text"
                              value={item.codigo}
                              onChange={(e) =>
                                handleSinapiCodigoChange(
                                  grupo.id,
                                  item.id,
                                  e.target.value
                                )
                              }
                              onFocus={() => {
                                if (item.codigo.trim()) {
                                  setSinapiSearch((s) => ({
                                    ...s,
                                    grupoId: grupo.id,
                                    itemId: item.id,
                                    field: 'codigo',
                                    term: item.codigo,
                                    results: [],
                                    loading: true,
                                    open: true,
                                  }));
                                  runSinapiSearch(grupo.id, item.id, 'codigo', item.codigo);
                                }
                              }}
                              className="w-full border rounded px-2 py-1 max-w-[80px]"
                              placeholder="SINAPI"
                            />
                          </td>
                          <td className="py-2 relative">
                            <input
                              type="text"
                              value={item.descricao}
                              onChange={(e) =>
                                handleSinapiDescricaoChange(
                                  grupo.id,
                                  item.id,
                                  e.target.value
                                )
                              }
                              onFocus={() => {
                                if (item.descricao.trim()) {
                                  setSinapiSearch((s) => ({
                                    ...s,
                                    grupoId: grupo.id,
                                    itemId: item.id,
                                    field: 'descricao',
                                    term: item.descricao,
                                    results: [],
                                    loading: true,
                                    open: true,
                                  }));
                                  runSinapiSearch(grupo.id, item.id, 'descricao', item.descricao);
                                }
                              }}
                              className="w-full border rounded px-2 py-1"
                              placeholder="Descrição do item"
                            />
                            {sinapiSearch.grupoId === grupo.id &&
                              sinapiSearch.itemId === item.id &&
                              sinapiSearch.open && (
                                <div className="absolute left-0 right-0 top-full z-50 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto overflow-x-hidden min-w-[320px]">
                                  {sinapiSearch.loading ? (
                                    <div className="px-3 py-4 text-sm text-gray-500">
                                      Buscando...
                                    </div>
                                  ) : sinapiSearch.results.length === 0 ? (
                                    <div className="px-3 py-4 text-sm text-gray-500">
                                      Nenhuma composição encontrada.
                                    </div>
                                  ) : (
                                    sinapiSearch.results.map((comp, idx) => (
                                      <button
                                        key={`${comp.codigo_composicao}-${idx}`}
                                        type="button"
                                        onClick={() =>
                                          handleSelectSinapi(
                                            grupo.id,
                                            item.id,
                                            comp
                                          )
                                        }
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm"
                                      >
                                        <span className="font-medium text-gray-800">
                                          {comp.codigo_composicao}
                                        </span>
                                        {' — '}
                                        <span className="text-gray-600 block text-left break-words line-clamp-2">
                                          {comp.descricao}
                                        </span>
                                        {comp.preco != null && (
                                          <span className="text-primary text-xs">
                                            {' '}
                                            {formatarMoeda(comp.preco)} ({ufPrecoSINAPI})
                                          </span>
                                        )}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                          </td>
                          <td className="py-2">
                            <select
                              value={item.unidade}
                              onChange={(e) =>
                                atualizarItem(
                                  grupo.id,
                                  item.id,
                                  'unidade',
                                  e.target.value
                                )
                              }
                              className="border rounded px-2 py-1 w-full"
                            >
                              {UNIDADES.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.quantidade || ''}
                              onChange={(e) =>
                                atualizarItem(
                                  grupo.id,
                                  item.id,
                                  'quantidade',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.precoUnitario || ''}
                              onChange={(e) =>
                                atualizarItem(
                                  grupo.id,
                                  item.id,
                                  'precoUnitario',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 font-medium">
                            {formatarMoeda(item.total)}
                          </td>
                          <td className="py-2">
                            {item.codigo?.trim() ? (
                              <span className="flex items-center gap-0.5">
                                {composicoesComDetalhamentoCustom.has(item.codigo) && (
                                  <span
                                    className="text-amber-600"
                                    title="Detalhamento editado"
                                  >
                                    <Pencil size={12} />
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => abrirDetalhamento(grupo.id, item)}
                                  className="text-primary hover:text-primary/80"
                                  title="Ver detalhamento da composição"
                                >
                                  <Layers size={16} />
                                </button>
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => removerItem(grupo.id, item.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Remover item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={() => adicionarItem(grupo.id)}
                    className="mt-2 text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium"
                  >
                    <Plus size={16} />
                    Adicionar item
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={adicionarGrupo}
              className="text-primary hover:text-primary/80 flex items-center gap-2 font-medium"
            >
              <Plus size={18} />
              Adicionar grupo
            </button>

            <Modal
              isOpen={detalhamentoModal.open}
              onClose={fecharDetalhamento}
              title={`Detalhamento — ${detalhamentoModal.codigo}`}
              description={detalhamentoModal.descricao ? detalhamentoModal.descricao.slice(0, 80) + (detalhamentoModal.descricao.length > 80 ? '…' : '') : ''}
              size="xl"
              className="max-w-4xl"
              footer={
                <div className="flex justify-between items-center w-full">
                  <div>
                    {detalhamentoModal.hasCustom && (
                      <button
                        type="button"
                        onClick={() => void restaurarDetalhamento()}
                        disabled={detalhamentoModal.loading}
                        className="px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-50"
                      >
                        Restaurar valores de referência
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {detalhamentoModal.itens.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void salvarDetalhamento()}
                        disabled={detalhamentoModal.loading}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {detalhamentoModal.loading ? 'Salvando...' : 'Salvar alterações'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={fecharDetalhamento}
                      className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              }
            >
              {detalhamentoModal.loading && detalhamentoModal.itens.length === 0 ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="medium" />
                </div>
              ) : detalhamentoModal.itens.length === 0 ? (
                <p className="text-gray-500 py-4">
                  Nenhum detalhamento encontrado para esta composição.
                </p>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inserir item no detalhamento
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={inserirItemDetalhamentoBusca.term}
                        onChange={(e) =>
                          setInserirItemDetalhamentoBusca((s) => ({
                            ...s,
                            term: e.target.value,
                            open: true,
                          }))
                        }
                        onFocus={() =>
                          inserirItemDetalhamentoBusca.results.length > 0 &&
                          setInserirItemDetalhamentoBusca((s) => ({ ...s, open: true }))
                        }
                        onBlur={() =>
                          setTimeout(
                            () => setInserirItemDetalhamentoBusca((s) => ({ ...s, open: false })),
                            200
                          )
                        }
                        placeholder="Buscar por código ou descrição..."
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                      {inserirItemDetalhamentoBusca.loading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                          Buscando...
                        </span>
                      )}
                      {inserirItemDetalhamentoBusca.open && inserirItemDetalhamentoBusca.results.length > 0 && (() => {
                        const disponiveis = inserirItemDetalhamentoBusca.results.filter(
                          (r) => !detalhamentoModal.itens.some((i) => i.codigo_item === r.codigo_item)
                        );
                        return (
                          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border rounded shadow-lg">
                            {disponiveis.length > 0 ? (
                              disponiveis.slice(0, 20).map((r) => (
                                <button
                                  key={r.codigo_item}
                                  type="button"
                                  onClick={() => void adicionarItemNoDetalhamento(r)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-0 text-sm"
                                >
                                  <span className="font-medium">{r.codigo_item}</span>
                                  <span className="text-gray-500 ml-2">{r.descricao?.slice(0, 50)}{r.descricao && r.descricao.length > 50 ? '…' : ''}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                Nenhum item novo encontrado ou todos já estão no detalhamento.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600 border-b bg-gray-50">
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Código item</th>
                          <th className="px-3 py-2">Descrição</th>
                          <th className="px-3 py-2 w-16">Un.</th>
                          <th className="px-3 py-2 w-24 text-right">Coef.</th>
                          <th className="px-3 py-2 w-24 text-right">Preço unit. (R$)</th>
                          <th className="px-3 py-2 w-24 text-right">Custo parcial (R$)</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalhamentoModal.itens.map((i) => {
                          const precoUnit = detalhamentoModal.precosPorItem[i.codigo_item] ?? 0;
                          const custoParcial = i.coeficiente * precoUnit;
                          return (
                            <tr
                              key={`${i.codigo_item}-${i.is_from_ref ? i.id : i.id_custom ?? 0}`}
                              className="border-b border-gray-100"
                            >
                              <td className="px-3 py-2">{i.tipo_item}</td>
                              <td className="px-3 py-2 font-medium">{i.codigo_item}</td>
                              <td className="px-3 py-2">{i.descricao}</td>
                              <td className="px-3 py-2">{i.unidade_medida}</td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.0001}
                                  value={i.coeficiente}
                                  onChange={(e) =>
                                    atualizarCoeficienteNoModal(i, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full max-w-[100px] ml-auto text-right border rounded px-2 py-1"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                {precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {custoParcial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => void excluirItemDoDetalhamento(i)}
                                  disabled={detalhamentoModal.loading}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                  title="Excluir item do detalhamento"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <span className="text-sm font-medium text-gray-700">
                      Preço unit. composição ({detalhamentoModal.hasCustom ? 'calculado' : 'ref.'}):{' '}
                      {detalhamentoModal.itens
                        .reduce(
                          (s, i) =>
                            s + i.coeficiente * (detalhamentoModal.precosPorItem[i.codigo_item] ?? 0),
                          0
                        )
                        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </Modal>
          </div>
        )}

        {/* Etapa 3: BDI e Resumo */}
        {etapaAtual === 3 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Percent size={20} />
              BDI e Resumo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percentual BDI (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={percentualBDI}
                  onChange={(e) =>
                    setPercentualBDI(parseFloat(e.target.value) || 0)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bonificações e Despesas Indiretas sobre o custo direto
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total custo direto:</span>
                  <span className="font-medium">
                    {formatarMoeda(totalDireto)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>BDI ({percentualBDI}%):</span>
                  <span className="font-medium">{formatarMoeda(valorBDI)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total com BDI:</span>
                  <span className="text-primary">
                    {formatarMoeda(totalComBDI)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                value={dadosGerais.observacoes}
                onChange={(e) =>
                  setDadosGerais((p) => ({
                    ...p,
                    observacoes: e.target.value,
                  }))
                }
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Observações gerais"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condições de Pagamento
              </label>
              <textarea
                value={dadosGerais.condicoesPagamento}
                onChange={(e) =>
                  setDadosGerais((p) => ({
                    ...p,
                    condicoesPagamento: e.target.value,
                  }))
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        )}

        {/* Etapa 4: Revisão */}
        {etapaAtual === 4 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye size={20} />
              Revisão do Orçamento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Nº:</span> {dadosGerais.numero || '-'}
              </div>
              <div>
                <span className="text-gray-500">Obra:</span> {dadosGerais.obraNome}
              </div>
              <div>
                <span className="text-gray-500">Cliente:</span> {dadosGerais.cliente || '-'}
              </div>
              <div>
                <span className="text-gray-500">Emissão:</span>{' '}
                {dadosGerais.dataEmissao
                  ? new Date(dadosGerais.dataEmissao).toLocaleDateString('pt-BR')
                  : '-'}
              </div>
              <div>
                <span className="text-gray-500">Validade:</span>{' '}
                {dadosGerais.dataValidade
                  ? new Date(dadosGerais.dataValidade).toLocaleDateString('pt-BR')
                  : '-'}
              </div>
              <div>
                <span className="text-gray-500">Responsável:</span>{' '}
                {dadosGerais.responsavelTecnico || '-'}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-2">Grupo</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos
                    .filter((g) => g.itens.length > 0)
                    .map((g) => (
                      <tr key={g.id} className="border-t">
                        <td className="px-4 py-2">
                          {g.codigo} – {g.descricao}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatarMoeda(
                            g.itens.reduce((s, i) => s + i.total, 0)
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="bg-gray-50 px-4 py-3 flex justify-between font-bold">
                <span>Total com BDI</span>
                <span className="text-primary text-lg">
                  {formatarMoeda(totalComBDI)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navegação do wizard */}
        <div className="flex justify-between mt-8">
          <button
            onClick={voltarEtapa}
            disabled={etapaAtual === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
            Voltar
          </button>
          {etapaAtual < totalEtapas ? (
            <button
              onClick={avancarEtapa}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Próximo
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => void salvarOrcamento()}
              disabled={salvando}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? (
                <LoadingSpinner size="small" />
              ) : (
                <Check size={18} />
              )}
              Salvar Orçamento
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
