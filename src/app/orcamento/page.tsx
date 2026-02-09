'use client';

/**
 * Módulo de Orçamento de Obras - Fluxo completo
 *
 * Integrado ao banco de dados (orcamentos, orcamento_grupos, orcamento_itens).
 * Fluxo típico: dados gerais → estrutura e itens → BDI e resumo → revisão.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronLeft,
  FileText,
  FileDown,
  Calculator,
  Building2,
  Check,
  ListChecks,
  Percent,
  Eye,
  X,
  Layers,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import PDFOrcamento, {
  type FormatoPDFOrcamento,
  type DetalhamentoComposicaoPDF,
} from '@/components/orcamento/PDFOrcamento';
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
  aplicarOrcamentoAoControleInsumo,
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
  const { obraSelecionada, obras } = useObra();
  const { showNotification } = useNotification();

  const [orcamentos, setOrcamentos] = useState<OrcamentoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<'lista' | 'wizard'>('lista');
  const [orcamentoAtual, setOrcamentoAtual] = useState<OrcamentoDocumento | null>(null);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [orcamentoParaExcluir, setOrcamentoParaExcluir] = useState<OrcamentoDocumento | null>(null);
  const [modalPdfAberto, setModalPdfAberto] = useState(false);
  const [orcamentoParaPdf, setOrcamentoParaPdf] = useState<OrcamentoDocumento | null>(null);
  const [formatoPdfSelecionado, setFormatoPdfSelecionado] = useState<FormatoPDFOrcamento>('resumido');
  const [gerandoPdf, setGerandoPdf] = useState(false);
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

  const [obraParaControleInsumo, setObraParaControleInsumo] = useState<number | null>(null);
  const [aplicandoControleInsumo, setAplicandoControleInsumo] = useState(false);
  const [modalConfirmarAplicarInsumo, setModalConfirmarAplicarInsumo] = useState(false);

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

  const executarAplicarAoControleInsumo = async () => {
    const obraId = obraParaControleInsumo;
    if (!obraId) return;
    const blocosComItens = grupos.filter((g) => g.itens && g.itens.length > 0);
    if (blocosComItens.length === 0) return;
    const obra = obras.find((o) => o.id === obraId);
    setAplicandoControleInsumo(true);
    setModalConfirmarAplicarInsumo(false);
    try {
      const payload = grupos.map((g) => ({
        codigo: g.codigo,
        descricao: g.descricao,
        itens: g.itens.map((i) => ({
          codigo: (i.codigo || '').trim(),
          descricao: i.descricao,
          unidade: i.unidade,
          quantidade: i.quantidade,
          precoUnitario: i.precoUnitario,
        })),
      }));
      const result = await aplicarOrcamentoAoControleInsumo(
        obraId,
        obra?.empresa_id ?? null,
        payload,
        ufPrecoSINAPI,
        percentualBDI
      );
      showNotification({
        title: 'Aplicado ao Controle de Insumo',
        message: `Criados: ${result.etapas} etapa(s), ${result.composicoes} composição(ões) e ${result.itens} item(ns) de orçamento.`,
        type: 'success',
      });
    } catch (error) {
      console.error('Erro ao aplicar orçamento ao Controle de Insumo:', error);
      showNotification({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Não foi possível aplicar o orçamento ao Controle de Insumo.',
        type: 'error',
      });
    } finally {
      setAplicandoControleInsumo(false);
    }
  };

  const abrirConfirmacaoAplicarInsumo = () => {
    if (!obraParaControleInsumo) {
      showNotification({
        title: 'Obra não selecionada',
        message: 'Selecione a obra em que deseja aplicar o orçamento ao Controle de Insumo.',
        type: 'error',
      });
      return;
    }
    const blocosComItens = grupos.filter((g) => g.itens && g.itens.length > 0);
    if (blocosComItens.length === 0) {
      showNotification({
        title: 'Orçamento vazio',
        message: 'Adicione pelo menos um bloco com itens na etapa "Estrutura e Itens" antes de aplicar.',
        type: 'error',
      });
      return;
    }
    setModalConfirmarAplicarInsumo(true);
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

  const abrirModalPdf = (orc: OrcamentoDocumento) => {
    setOrcamentoParaPdf(orc);
    setFormatoPdfSelecionado('resumido');
    setModalPdfAberto(true);
  };

  const gerarPdfOrcamento = async () => {
    if (!orcamentoParaPdf) return;
    setGerandoPdf(true);
    try {
      const completo = await fetchOrcamentoCompleto(orcamentoParaPdf.id);
      if (!completo) {
        showNotification({
          title: 'Erro',
          message: 'Não foi possível carregar o orçamento para o PDF.',
          type: 'error',
        });
        return;
      }
      const { orcamento, grupos, itens } = completo;
      let detalhamentoPorComposicao: Record<string, DetalhamentoComposicaoPDF> = {};
      const ufDetalhamento = 'SP';

      if (formatoPdfSelecionado === 'analitico_com_item') {
        const codigosUnicos = [...new Set(itens.map((i) => (i.codigo || '').trim()).filter(Boolean))];
        for (const codigo of codigosUnicos) {
          const itensDetalhe = await fetchDetalhamentoComposicao(codigo, ufDetalhamento);
          const precosPorItem: Record<string, number> = {};
          for (const row of itensDetalhe) {
            const preco = await getPrecoItemDetalhamento(row.tipo_item, row.codigo_item, ufDetalhamento);
            precosPorItem[row.codigo_item] = preco ?? 0;
          }
          detalhamentoPorComposicao[codigo] = { itens: itensDetalhe, precosPorItem };
        }
      }

      const blob = await pdf(
        <PDFOrcamento
          formato={formatoPdfSelecionado}
          orcamento={orcamento}
          grupos={grupos}
          itens={itens}
          detalhamentoPorComposicao={detalhamentoPorComposicao}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const nomeArquivo = `orcamento-${orcamento.numero || orcamento.id}-${formatoPdfSelecionado}-${Date.now().toString(36)}.pdf`;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification({
        title: 'PDF gerado',
        message: 'O arquivo foi baixado com sucesso.',
        type: 'success',
      });
      setModalPdfAberto(false);
      setOrcamentoParaPdf(null);
    } catch (error) {
      console.error('Erro ao gerar PDF do orçamento:', error);
      showNotification({
        title: 'Erro',
        message: 'Não foi possível gerar o PDF. Tente novamente.',
        type: 'error',
      });
    } finally {
      setGerandoPdf(false);
    }
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
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-7 h-7 md:w-8 md:h-8 text-primary shrink-0" />
              Orçamento de Obras
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Documentos de orçamento integrados ao sistema
            </p>
          </div>
          <button
            onClick={novoOrcamento}
            className="w-full md:w-auto min-h-[48px] md:min-h-0 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 md:py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium active:bg-primary/80"
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
          <div className="bg-white rounded-xl shadow-sm border p-6 md:p-12 text-center">
            <FileText className="w-14 h-14 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-base md:text-lg font-semibold text-gray-700 mb-2">
              Nenhum orçamento criado
            </h2>
            <p className="text-sm md:text-base text-gray-500 mb-6 max-w-md mx-auto">
              Crie seu primeiro orçamento para a obra. O fluxo inclui dados
              gerais, grupos de serviços, itens com quantidades e preços, BDI e
              resumo.
            </p>
            <button
              onClick={novoOrcamento}
              className="w-full md:w-auto min-h-[48px] md:min-h-0 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg flex items-center justify-center gap-2 mx-auto transition-colors font-medium active:bg-primary/80"
            >
              <Plus size={20} />
              Criar Orçamento
            </button>
          </div>
        ) : (
          <>
            {/* Layout mobile: cards */}
            <div className="md:hidden space-y-3">
              {orcamentos.map((o) => (
                <div
                  key={o.id}
                  className="bg-white rounded-xl shadow-sm border p-4 space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">
                        {o.numero || o.obra_nome || 'Orçamento'}
                      </p>
                      {o.obra_nome && o.numero && (
                        <p className="text-sm text-gray-500 truncate">{o.obra_nome}</p>
                      )}
                      {o.cliente && (
                        <p className="text-sm text-gray-500 truncate">{o.cliente}</p>
                      )}
                    </div>
                    <p className="font-semibold text-primary shrink-0">
                      {formatarMoeda(o.total_com_bdi)}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => abrirModalPdf(o)}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg border border-primary text-primary text-sm font-medium active:bg-primary/10"
                      title="Gerar PDF"
                    >
                      <FileDown size={18} />
                      PDF
                    </button>
                    <button
                      onClick={() => editarOrcamento(o)}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg border border-amber-600 text-amber-600 text-sm font-medium active:bg-amber-50"
                      title="Editar"
                    >
                      <Pencil size={18} />
                      Editar
                    </button>
                    <button
                      onClick={() => abrirModalExcluir(o)}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg border border-red-600 text-red-600 text-sm font-medium active:bg-red-50"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Layout desktop: tabela */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
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
                          onClick={() => abrirModalPdf(o)}
                          className="text-primary hover:text-primary/80"
                          title="Gerar PDF"
                        >
                          <FileDown size={18} />
                        </button>
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
          </>
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

        <Modal
          isOpen={modalPdfAberto}
          onClose={() => {
            if (!gerandoPdf) {
              setModalPdfAberto(false);
              setOrcamentoParaPdf(null);
            }
          }}
          title="Gerar PDF do Orçamento"
          description={
            orcamentoParaPdf
              ? `${orcamentoParaPdf.numero || 'Orçamento'} – ${orcamentoParaPdf.obra_nome || '-'}`
              : 'Selecione o formato do PDF'
          }
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalPdfAberto(false);
                  setOrcamentoParaPdf(null);
                }}
                disabled={gerandoPdf}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void gerarPdfOrcamento()}
                disabled={gerandoPdf}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {gerandoPdf ? (
                  <>
                    <LoadingSpinner size="small" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileDown size={18} />
                    Gerar PDF
                  </>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Escolha o formato do documento:
            </p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="formatoPdf"
                  value="resumido"
                  checked={formatoPdfSelecionado === 'resumido'}
                  onChange={() => setFormatoPdfSelecionado('resumido')}
                  className="mt-1 text-primary"
                />
                <div>
                  <span className="font-medium text-gray-900">Resumido</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Etapas e seus respectivos valores.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="formatoPdf"
                  value="analitico"
                  checked={formatoPdfSelecionado === 'analitico'}
                  onChange={() => setFormatoPdfSelecionado('analitico')}
                  className="mt-1 text-primary"
                />
                <div>
                  <span className="font-medium text-gray-900">Analítico</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Etapa e Composição: código, descrição, quantidade, preço e total por item.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="formatoPdf"
                  value="analitico_com_item"
                  checked={formatoPdfSelecionado === 'analitico_com_item'}
                  onChange={() => setFormatoPdfSelecionado('analitico_com_item')}
                  className="mt-1 text-primary"
                />
                <div>
                  <span className="font-medium text-gray-900">Analítico com item</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Etapa, Composição e itens do detalhamento (insumos de cada composição).
                  </p>
                </div>
              </label>
            </div>
          </div>
        </Modal>
      </main>
    );
  }

  // Wizard de criação/edição
  const etapas = [
    { num: 1, titulo: 'Dados Gerais', icon: FileText },
    { num: 2, titulo: 'Estrutura e Itens', icon: ListChecks },
    { num: 3, titulo: 'BDI e Resumo', icon: Percent },
    { num: 4, titulo: 'Revisão', icon: Eye },
  ];

  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-7 h-7 md:w-8 md:h-8 text-primary shrink-0" />
            {orcamentoAtual ? 'Editar' : 'Novo'} Orçamento
          </h1>
          <button
            onClick={cancelar}
            className="w-full md:w-auto min-h-[44px] md:min-h-0 flex items-center justify-center gap-1 text-gray-600 hover:text-gray-800 rounded-lg border border-gray-300 md:border-0 md:bg-transparent active:bg-gray-100"
          >
            <X size={18} />
            Cancelar
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6 md:mb-8 overflow-x-auto pb-2 -mx-1">
          {etapas.map((e, i) => (
            <div key={e.num} className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEtapaAtual(e.num)}
                className={`flex items-center gap-2 px-3 py-2.5 md:py-2 min-h-[44px] md:min-h-0 rounded-lg text-sm font-medium transition-colors ${etapaAtual === e.num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-200'
                  }`}
              >
                <e.icon size={16} className="shrink-0" />
                <span className="whitespace-nowrap">{e.titulo}</span>
              </button>
              {i < etapas.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>

        {/* Etapa 1: Dados Gerais */}
        {etapaAtual === 1 && (
          <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6 space-y-4">
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
                  className="w-full min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
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
                  className="w-full min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
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
                  className="w-full min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
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
                  className="w-full min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
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
                  className="w-full min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
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
                  className="w-full min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
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
                  className="w-full min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
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
                className="w-full min-h-[80px] border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
              />
            </div>
          </div>
        )}

        {/* Etapa 2: Estrutura e Itens */}
        {etapaAtual === 2 && (
          <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListChecks size={20} />
              Estrutura e Itens do Orçamento
            </h2>
            <p className="text-sm text-gray-600">
              Adicione itens em cada bloco. Código, descrição, unidade,
              quantidade e preço unitário.
            </p>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-sm font-medium text-gray-700">
                  UF para preço SINAPI:
                </label>
                <select
                  value={ufPrecoSINAPI}
                  onChange={(e) => setUfPrecoSINAPI(e.target.value)}
                  className="min-h-[44px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2 text-sm md:px-2 md:py-1"
                >
                  {UFS_SINAPI.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-gray-500 md:flex-1">
                Busque por código ou descrição nos campos abaixo; o preço será da UF selecionada.
              </span>
            </div>

            {grupos.map((grupo) => (
              <div
                key={grupo.id}
                className="border rounded-lg overflow-visible"
              >
                <div className="bg-gray-50 px-4 py-3 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                  <div className="flex flex-col gap-2 md:flex-row md:gap-4 md:flex-1 min-w-0">
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
                      className="w-16 shrink-0 min-h-[44px] md:min-h-0 border rounded-lg md:rounded px-2 py-2 md:py-1 text-sm font-medium"
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
                      className="flex-1 min-w-0 min-h-[44px] md:min-h-0 border rounded-lg md:rounded px-2 py-2 md:py-1 text-sm"
                      placeholder="Descrição do bloco"
                    />
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                    <span className="text-sm font-semibold text-gray-800 md:text-gray-600">
                      {formatarMoeda(
                        grupo.itens.reduce((s, i) => s + i.total, 0)
                      )}
                    </span>
                    <button
                      onClick={() => removerGrupo(grupo.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 active:bg-red-100"
                      title="Remover bloco"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  {/* Layout mobile: cards por item */}
                  <div className="md:hidden space-y-3">
                    {grupo.itens.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50/80 rounded-xl border border-gray-200 p-4 space-y-3"
                      >
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                          <div className="min-w-0 space-y-2">
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
                              className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="Código SINAPI"
                            />
                            <div className="relative">
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
                                className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                placeholder="Descrição"
                              />
                              {sinapiSearch.grupoId === grupo.id &&
                                sinapiSearch.itemId === item.id &&
                                sinapiSearch.open && (
                                  <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto w-full">
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
                                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm"
                                        >
                                          <span className="font-medium text-gray-800">
                                            {comp.codigo_composicao}
                                          </span>
                                          <span className="text-gray-600 block text-left break-words line-clamp-2">
                                            {' — '}{comp.descricao}
                                          </span>
                                          {comp.preco != null && (
                                            <span className="text-primary text-xs">
                                              {formatarMoeda(comp.preco)} ({ufPrecoSINAPI})
                                            </span>
                                          )}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                          <button
                            onClick={() => removerItem(grupo.id, item.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100 shrink-0"
                            title="Remover item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Un.</label>
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
                              className="w-full min-h-[44px] border border-gray-300 rounded-lg px-2 py-2 text-sm"
                            >
                              {UNIDADES.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Qtd</label>
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
                              className="w-full min-h-[44px] border border-gray-300 rounded-lg px-2 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Preço Unit.</label>
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
                              className="w-full min-h-[44px] border border-gray-300 rounded-lg px-2 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <span className="text-sm font-semibold text-gray-800">
                            Total: {formatarMoeda(item.total)}
                          </span>
                          {item.codigo?.trim() ? (
                            <span className="flex items-center gap-1">
                              {composicoesComDetalhamentoCustom.has(item.codigo) && (
                                <span className="text-amber-600" title="Detalhamento editado">
                                  <Pencil size={14} />
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => abrirDetalhamento(grupo.id, item)}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 active:bg-primary/20"
                                title="Detalhamento"
                              >
                                <Layers size={18} />
                              </button>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Layout desktop: tabela */}
                  <div className="hidden md:block overflow-x-auto">
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
                  </div>
                  <button
                    onClick={() => adicionarItem(grupo.id)}
                    className="mt-4 md:mt-2 min-h-[48px] flex items-center justify-center gap-2 text-primary hover:text-primary/80 text-sm font-medium rounded-lg border border-dashed border-primary/40 active:bg-primary/5 py-2"
                  >
                    <Plus size={16} />
                    Adicionar item
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={adicionarGrupo}
              className="w-full md:w-auto min-h-[48px] md:min-h-0 text-primary hover:text-primary/80 flex items-center justify-center gap-2 font-medium rounded-lg border border-dashed border-primary/50 py-2 active:bg-primary/5"
            >
              <Plus size={18} />
              Adicionar bloco
            </button>

            <Modal
              isOpen={detalhamentoModal.open}
              onClose={fecharDetalhamento}
              title={`Detalhamento — ${detalhamentoModal.codigo}`}
              description={detalhamentoModal.descricao ? detalhamentoModal.descricao.slice(0, 80) + (detalhamentoModal.descricao.length > 80 ? '…' : '') : ''}
              size="xl"
              className="max-w-4xl max-md:!max-w-[calc(100vw-0.5rem)] max-md:!max-h-[92dvh] max-md:flex max-md:flex-col max-md:!m-0"
              footer={
                <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center w-full">
                  <div className="order-2 md:order-1">
                    {detalhamentoModal.hasCustom && (
                      <button
                        type="button"
                        onClick={() => void restaurarDetalhamento()}
                        disabled={detalhamentoModal.loading}
                        className="w-full md:w-auto min-h-[48px] md:min-h-0 px-4 py-2.5 md:py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-50 text-sm font-medium"
                      >
                        Restaurar valores de referência
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col-reverse gap-2 md:flex-row order-1 md:order-2">
                    {detalhamentoModal.itens.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void salvarDetalhamento()}
                        disabled={detalhamentoModal.loading}
                        className="w-full md:w-auto min-h-[48px] md:min-h-0 px-4 py-2.5 md:py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium active:bg-primary/80"
                      >
                        {detalhamentoModal.loading ? 'Salvando...' : 'Salvar alterações'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={fecharDetalhamento}
                      className="w-full md:w-auto min-h-[48px] md:min-h-0 px-4 py-2.5 md:py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium active:bg-gray-400"
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
                        className="w-full min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-sm"
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
                  {/* Layout mobile: cards */}
                  <div className="md:hidden space-y-3 max-h-[50vh] overflow-y-auto -mx-1 px-1">
                    {detalhamentoModal.itens.map((i) => {
                      const precoUnit = detalhamentoModal.precosPorItem[i.codigo_item] ?? 0;
                      const custoParcial = i.coeficiente * precoUnit;
                      return (
                        <div
                          key={`${i.codigo_item}-${i.is_from_ref ? i.id : i.id_custom ?? 0}`}
                          className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-500 uppercase">{i.tipo_item}</p>
                              <p className="font-semibold text-gray-900">{i.codigo_item}</p>
                              <p className="text-sm text-gray-600 break-words line-clamp-2">{i.descricao}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void excluirItemDoDetalhamento(i)}
                              disabled={detalhamentoModal.loading}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100 shrink-0 disabled:opacity-50"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Un.</label>
                              <p className="font-medium">{i.unidade_medida}</p>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Coef.</label>
                              <input
                                type="number"
                                min={0}
                                step={0.0001}
                                value={i.coeficiente}
                                onChange={(e) =>
                                  atualizarCoeficienteNoModal(i, parseFloat(e.target.value) || 0)
                                }
                                className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 py-2 text-right text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Preço unit.</label>
                              <p className="font-medium">
                                {precoUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Custo parcial</label>
                              <p className="font-semibold text-gray-900">
                                {custoParcial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Layout desktop: tabela */}
                  <div className="hidden md:block overflow-x-auto max-h-96 overflow-y-auto">
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
          <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6 space-y-6">
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
                  className="w-full min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
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
                className="w-full min-h-[80px] border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
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
                className="w-full min-h-[100px] border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-base"
              />
            </div>
          </div>
        )}

        {/* Etapa 4: Revisão */}
        {etapaAtual === 4 && (
          <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6 space-y-6">
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
              {/* Layout mobile: cards */}
              <div className="md:hidden divide-y">
                {grupos
                  .filter((g) => g.itens.length > 0)
                  .map((g) => (
                    <div key={g.id} className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-gray-800 pr-2 truncate">
                        {g.codigo} – {g.descricao}
                      </span>
                      <span className="font-medium shrink-0">
                        {formatarMoeda(g.itens.reduce((s, i) => s + i.total, 0))}
                      </span>
                    </div>
                  ))}
                <div className="bg-gray-50 px-4 py-3 flex justify-between font-bold">
                  <span>Total com BDI</span>
                  <span className="text-primary text-lg">
                    {formatarMoeda(totalComBDI)}
                  </span>
                </div>
              </div>
              {/* Layout desktop: tabela */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-2">Bloco</th>
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

            {/* Aplicar orçamento ao Controle de Insumo */}
            {grupos.filter((g) => g.itens.length > 0).length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50/80 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Layers size={18} />
                  Aplicar ao Controle de Insumo
                </h3>
                <p className="text-xs text-gray-600">
                  Crie Etapas, Composições e Itens de orçamento na obra escolhida a partir da estrutura atual.
                </p>
                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
                    <label htmlFor="obra-controle-insumo" className="text-sm font-medium text-gray-700">
                      Obra:
                    </label>
                    <select
                      id="obra-controle-insumo"
                      value={obraParaControleInsumo ?? ''}
                      onChange={(e) =>
                        setObraParaControleInsumo(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-sm w-full md:min-w-[200px]"
                    >
                      <option value="">Selecione a obra</option>
                      {obras.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={abrirConfirmacaoAplicarInsumo}
                    disabled={!obraParaControleInsumo || aplicandoControleInsumo}
                    className="w-full md:w-auto min-h-[48px] md:min-h-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:bg-primary/80"
                  >
                    {aplicandoControleInsumo ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <Layers size={16} />
                    )}
                    {aplicandoControleInsumo ? 'Aplicando...' : 'Aplicar ao Controle de Insumo'}
                  </button>
                </div>
              </div>
            )}

            {/* Modal de confirmação: Aplicar orçamento ao Controle de Insumo */}
            <ConfirmacaoModal
              isOpen={modalConfirmarAplicarInsumo}
              onClose={() => setModalConfirmarAplicarInsumo(false)}
              onConfirm={() => void executarAplicarAoControleInsumo()}
              titulo="Aplicar ao Controle de Insumo"
              mensagem={
                obraParaControleInsumo ? (
                  <>
                    Deseja realmente aplicar o orçamento na obra{' '}
                    <span className="font-semibold text-gray-900">
                      &quot;{obras.find((o) => o.id === obraParaControleInsumo)?.nome ?? 'selecionada'}&quot;
                    </span>
                    ? Serão criadas Etapas, Composições e Itens de orçamento a partir da estrutura atual.
                  </>
                ) : (
                  ''
                )
              }
              confirmButtonText="Aplicar"
              cancelButtonText="Cancelar"
            />
          </div>
        )}

        {/* Navegação do wizard */}
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-between mt-6 md:mt-8">
          <button
            onClick={voltarEtapa}
            disabled={etapaAtual === 1}
            className="w-full md:w-auto min-h-[48px] md:min-h-0 flex items-center justify-center gap-2 px-4 py-3 md:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-100"
          >
            <ChevronLeft size={18} />
            Voltar
          </button>
          {etapaAtual < totalEtapas ? (
            <button
              onClick={avancarEtapa}
              className="w-full md:w-auto min-h-[48px] md:min-h-0 flex items-center justify-center gap-2 px-4 py-3 md:py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
            >
              Próximo
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => void salvarOrcamento()}
              disabled={salvando}
              className="w-full md:w-auto min-h-[48px] md:min-h-0 flex items-center justify-center gap-2 px-6 py-3 md:py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed active:bg-green-800"
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
