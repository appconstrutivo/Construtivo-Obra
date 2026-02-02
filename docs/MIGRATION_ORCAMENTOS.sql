-- =====================================================
-- MIGRATION: Módulo de Orçamento de Obras
-- Projeto: Construtivo Obra
-- Objetivo: Tabelas para orçamentos (documentos) independentes
-- Data: Janeiro 2025
-- =====================================================
-- IMPORTANTE: Orçamento aqui é diferente de itens_orcamento (financeiro).
-- itens_orcamento está vinculado a grupos/centros de custo.
-- Estas tabelas são para documentos de orçamento comercial.
-- =====================================================

-- Tabela principal: orcamentos (cabeçalho)
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id BIGSERIAL PRIMARY KEY,
    obra_id INTEGER REFERENCES public.obras(id) ON DELETE CASCADE,
    empresa_id BIGINT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    
    -- Dados gerais
    numero VARCHAR(50),
    obra_nome VARCHAR(255),
    cliente VARCHAR(255),
    endereco TEXT,
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_validade DATE,
    responsavel_tecnico VARCHAR(255),
    crea VARCHAR(50),
    objeto TEXT,
    observacoes TEXT,
    condicoes_pagamento TEXT,
    
    -- Totais e BDI
    percentual_bdi NUMERIC(10,2) DEFAULT 15.00,
    total_direto NUMERIC(15,2) DEFAULT 0.00,
    valor_bdi NUMERIC(15,2) DEFAULT 0.00,
    total_com_bdi NUMERIC(15,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_empresa ON public.orcamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_obra ON public.orcamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_data ON public.orcamentos(data_emissao);

-- Tabela: grupos do orçamento
CREATE TABLE IF NOT EXISTS public.orcamento_grupos (
    id BIGSERIAL PRIMARY KEY,
    orcamento_id BIGINT NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
    codigo VARCHAR(10) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    ordem INTEGER DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orcamento_grupos_orcamento ON public.orcamento_grupos(orcamento_id);

-- Tabela: itens de cada grupo
CREATE TABLE IF NOT EXISTS public.orcamento_itens (
    id BIGSERIAL PRIMARY KEY,
    orcamento_grupo_id BIGINT NOT NULL REFERENCES public.orcamento_grupos(id) ON DELETE CASCADE,
    codigo VARCHAR(50),
    descricao VARCHAR(500) NOT NULL,
    unidade VARCHAR(20) NOT NULL DEFAULT 'un',
    quantidade NUMERIC(15,4) DEFAULT 0,
    preco_unitario NUMERIC(15,4) DEFAULT 0,
    total NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_grupo ON public.orcamento_itens(orcamento_grupo_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_orcamentos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_orcamentos_updated_at ON public.orcamentos;
CREATE TRIGGER update_orcamentos_updated_at
    BEFORE UPDATE ON public.orcamentos
    FOR EACH ROW EXECUTE FUNCTION public.update_orcamentos_updated_at();

DROP TRIGGER IF EXISTS update_orcamento_grupos_updated_at ON public.orcamento_grupos;
CREATE TRIGGER update_orcamento_grupos_updated_at
    BEFORE UPDATE ON public.orcamento_grupos
    FOR EACH ROW EXECUTE FUNCTION public.update_orcamentos_updated_at();

DROP TRIGGER IF EXISTS update_orcamento_itens_updated_at ON public.orcamento_itens;
CREATE TRIGGER update_orcamento_itens_updated_at
    BEFORE UPDATE ON public.orcamento_itens
    FOR EACH ROW EXECUTE FUNCTION public.update_orcamentos_updated_at();

-- RLS
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

-- Políticas: orcamentos
CREATE POLICY "Isolamento orcamentos SELECT"
    ON public.orcamentos FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento orcamentos INSERT"
    ON public.orcamentos FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento orcamentos UPDATE"
    ON public.orcamentos FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento orcamentos DELETE"
    ON public.orcamentos FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- Políticas: orcamento_grupos (via orcamentos)
CREATE POLICY "Isolamento orcamento_grupos SELECT"
    ON public.orcamento_grupos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamentos o
            WHERE o.id = orcamento_grupos.orcamento_id
            AND o.empresa_id = get_user_empresa_id()
            AND is_empresa_ativa()
        )
    );

CREATE POLICY "Isolamento orcamento_grupos INSERT"
    ON public.orcamento_grupos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orcamentos o
            WHERE o.id = orcamento_grupos.orcamento_id
            AND o.empresa_id = get_user_empresa_id()
            AND is_empresa_ativa()
        )
    );

CREATE POLICY "Isolamento orcamento_grupos UPDATE"
    ON public.orcamento_grupos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamentos o
            WHERE o.id = orcamento_grupos.orcamento_id
            AND o.empresa_id = get_user_empresa_id()
            AND is_empresa_ativa()
        )
    );

CREATE POLICY "Isolamento orcamento_grupos DELETE"
    ON public.orcamento_grupos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamentos o
            WHERE o.id = orcamento_grupos.orcamento_id
            AND o.empresa_id = get_user_empresa_id()
            AND is_empresa_ativa()
        )
    );

-- Políticas: orcamento_itens (via grupos -> orcamentos)
CREATE POLICY "Isolamento orcamento_itens SELECT"
    ON public.orcamento_itens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamento_grupos og
            JOIN public.orcamentos o ON o.id = og.orcamento_id
            WHERE og.id = orcamento_itens.orcamento_grupo_id
            AND o.empresa_id = get_user_empresa_id()
            AND is_empresa_ativa()
        )
    );

CREATE POLICY "Isolamento orcamento_itens INSERT"
    ON public.orcamento_itens FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orcamento_grupos og
            JOIN public.orcamentos o ON o.id = og.orcamento_id
            WHERE og.id = orcamento_itens.orcamento_grupo_id
            AND o.empresa_id = get_user_empresa_id()
            AND is_empresa_ativa()
        )
    );

CREATE POLICY "Isolamento orcamento_itens UPDATE"
    ON public.orcamento_itens FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamento_grupos og
            JOIN public.orcamentos o ON o.id = og.orcamento_id
            WHERE og.id = orcamento_itens.orcamento_grupo_id
            AND o.empresa_id = get_user_empresa_id()
            AND is_empresa_ativa()
        )
    );

CREATE POLICY "Isolamento orcamento_itens DELETE"
    ON public.orcamento_itens FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamento_grupos og
            JOIN public.orcamentos o ON o.id = og.orcamento_id
            WHERE og.id = orcamento_itens.orcamento_grupo_id
            AND o.empresa_id = get_user_empresa_id()
            AND is_empresa_ativa()
        )
    );
