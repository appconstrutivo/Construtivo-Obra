-- =====================================================
-- MIGRATION: Transformação para Multitenant
-- Projeto: Construtivo Obra
-- Objetivo: Implementar isolamento total por empresa (SaaS)
-- Data: Janeiro 2025
-- =====================================================

-- =====================================================
-- PARTE 1: CRIAÇÃO DAS TABELAS DE MULTITENANCY
-- =====================================================

-- Tabela de Planos (níveis de assinatura)
CREATE TABLE IF NOT EXISTS public.planos (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    preco_mensal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    preco_anual NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    limite_usuarios INTEGER DEFAULT NULL, -- NULL = ilimitado
    limite_obras INTEGER DEFAULT NULL, -- NULL = ilimitado
    funcionalidades JSONB DEFAULT '{}', -- Funcionalidades habilitadas no plano
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0, -- Para ordenação na exibição
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para planos
CREATE INDEX idx_planos_ativo ON public.planos(ativo);
CREATE INDEX idx_planos_ordem ON public.planos(ordem);

-- Tabela de Empresas (Tenants/Organizações)
CREATE TABLE IF NOT EXISTS public.empresas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(9),
    logo_url TEXT,
    
    -- Dados da assinatura
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
    data_inicio_trial TIMESTAMPTZ DEFAULT NOW(),
    data_fim_trial TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 days'),
    
    -- Configurações da empresa
    configuracoes JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para empresas
CREATE INDEX idx_empresas_status ON public.empresas(status);
CREATE INDEX idx_empresas_cnpj ON public.empresas(cnpj);

-- Tabela de Assinaturas (vínculo empresa-plano)
CREATE TABLE IF NOT EXISTS public.assinaturas (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    plano_id BIGINT NOT NULL REFERENCES public.planos(id) ON DELETE RESTRICT,
    
    -- Período da assinatura
    data_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_fim TIMESTAMPTZ,
    
    -- Valores
    valor_mensal NUMERIC(10,2),
    valor_anual NUMERIC(10,2),
    periodicidade VARCHAR(20) CHECK (periodicidade IN ('mensal', 'anual')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    data_cancelamento TIMESTAMPTZ,
    motivo_cancelamento TEXT,
    
    -- Renovação automática
    renovacao_automatica BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Uma empresa só pode ter uma assinatura ativa por vez
    CONSTRAINT unique_empresa_assinatura_ativa UNIQUE(empresa_id, status)
);

-- Índices para assinaturas
CREATE INDEX idx_assinaturas_empresa ON public.assinaturas(empresa_id);
CREATE INDEX idx_assinaturas_plano ON public.assinaturas(plano_id);
CREATE INDEX idx_assinaturas_status ON public.assinaturas(status);
CREATE INDEX idx_assinaturas_data_fim ON public.assinaturas(data_fim);

-- =====================================================
-- PARTE 2: MODIFICAÇÃO DA TABELA USUARIOS
-- =====================================================

-- Adicionar campos para multitenant
ALTER TABLE public.usuarios 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'membro' CHECK (role IN ('admin', 'membro', 'visualizador')),
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS convidado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS data_convite TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS data_ativacao TIMESTAMPTZ;

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON public.usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON public.usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON public.usuarios(ativo);

-- =====================================================
-- PARTE 3: ADICIONAR EMPRESA_ID EM TODAS AS TABELAS
-- =====================================================

-- centros_custo
ALTER TABLE public.centros_custo 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_centros_custo_empresa ON public.centros_custo(empresa_id);

-- grupos
ALTER TABLE public.grupos 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_grupos_empresa ON public.grupos(empresa_id);

-- itens_orcamento
ALTER TABLE public.itens_orcamento 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_empresa ON public.itens_orcamento(empresa_id);

-- itens_custo
ALTER TABLE public.itens_custo 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_itens_custo_empresa ON public.itens_custo(empresa_id);

-- fornecedores
ALTER TABLE public.fornecedores 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON public.fornecedores(empresa_id);

-- negociacoes
ALTER TABLE public.negociacoes 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_negociacoes_empresa ON public.negociacoes(empresa_id);

-- itens_negociacao
ALTER TABLE public.itens_negociacao 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_itens_negociacao_empresa ON public.itens_negociacao(empresa_id);

-- medicoes
ALTER TABLE public.medicoes 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_medicoes_empresa ON public.medicoes(empresa_id);

-- itens_medicao
ALTER TABLE public.itens_medicao 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_itens_medicao_empresa ON public.itens_medicao(empresa_id);

-- pedidos_compra
ALTER TABLE public.pedidos_compra 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_empresa ON public.pedidos_compra(empresa_id);

-- itens_pedido_compra
ALTER TABLE public.itens_pedido_compra 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_itens_pedido_compra_empresa ON public.itens_pedido_compra(empresa_id);

-- parcelas_pagamento
ALTER TABLE public.parcelas_pagamento 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_parcelas_pagamento_empresa ON public.parcelas_pagamento(empresa_id);

-- parcelas_pedido_compra
ALTER TABLE public.parcelas_pedido_compra 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_parcelas_pedido_compra_empresa ON public.parcelas_pedido_compra(empresa_id);

-- parcelas_medicao
ALTER TABLE public.parcelas_medicao 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_parcelas_medicao_empresa ON public.parcelas_medicao(empresa_id);

-- obras
ALTER TABLE public.obras 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_obras_empresa ON public.obras(empresa_id);

-- clientes
ALTER TABLE public.clientes 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);

-- parcelas_receber
ALTER TABLE public.parcelas_receber 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_parcelas_receber_empresa ON public.parcelas_receber(empresa_id);

-- =====================================================
-- PARTE 4: FUNÇÕES AUXILIARES PARA MULTITENANT
-- =====================================================

-- Função para obter a empresa_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_empresa_id BIGINT;
BEGIN
    SELECT empresa_id INTO v_empresa_id
    FROM public.usuarios
    WHERE id = auth.uid();
    
    RETURN v_empresa_id;
END;
$$;

-- Função para verificar se usuário é admin da empresa
CREATE OR REPLACE FUNCTION public.is_empresa_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_role VARCHAR(20);
BEGIN
    SELECT role INTO v_role
    FROM public.usuarios
    WHERE id = auth.uid();
    
    RETURN v_role = 'admin';
END;
$$;

-- Função para verificar se a empresa está ativa
CREATE OR REPLACE FUNCTION public.is_empresa_ativa()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_status VARCHAR(20);
    v_empresa_id BIGINT;
BEGIN
    -- Obter empresa do usuário
    SELECT empresa_id INTO v_empresa_id
    FROM public.usuarios
    WHERE id = auth.uid();
    
    IF v_empresa_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar status da empresa
    SELECT status INTO v_status
    FROM public.empresas
    WHERE id = v_empresa_id;
    
    RETURN v_status IN ('trial', 'active');
END;
$$;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =====================================================
-- PARTE 5: TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para empresas
DROP TRIGGER IF EXISTS update_empresas_updated_at ON public.empresas;
CREATE TRIGGER update_empresas_updated_at
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para planos
DROP TRIGGER IF EXISTS update_planos_updated_at ON public.planos;
CREATE TRIGGER update_planos_updated_at
    BEFORE UPDATE ON public.planos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para assinaturas
DROP TRIGGER IF EXISTS update_assinaturas_updated_at ON public.assinaturas;
CREATE TRIGGER update_assinaturas_updated_at
    BEFORE UPDATE ON public.assinaturas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PARTE 6: POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negociacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_negociacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_medicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_pedido_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_medicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_receber ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS: EMPRESAS
-- =====================================================

-- Usuários podem ver apenas sua própria empresa
CREATE POLICY "Usuarios podem ver sua empresa"
    ON public.empresas
    FOR SELECT
    USING (id = get_user_empresa_id());

-- Apenas admins podem atualizar a empresa
CREATE POLICY "Admins podem atualizar empresa"
    ON public.empresas
    FOR UPDATE
    USING (id = get_user_empresa_id() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: PLANOS (Público para visualização)
-- =====================================================

-- Todos podem ver planos ativos (para página de preços)
CREATE POLICY "Todos podem ver planos ativos"
    ON public.planos
    FOR SELECT
    USING (ativo = true);

-- =====================================================
-- POLÍTICAS RLS: ASSINATURAS
-- =====================================================

-- Usuários podem ver assinaturas de sua empresa
CREATE POLICY "Usuarios podem ver assinaturas da empresa"
    ON public.assinaturas
    FOR SELECT
    USING (empresa_id = get_user_empresa_id());

-- Apenas admins podem gerenciar assinaturas
CREATE POLICY "Admins podem gerenciar assinaturas"
    ON public.assinaturas
    FOR ALL
    USING (empresa_id = get_user_empresa_id() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: CENTROS_CUSTO
-- =====================================================

CREATE POLICY "Isolamento por empresa - centros_custo SELECT"
    ON public.centros_custo
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - centros_custo INSERT"
    ON public.centros_custo
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - centros_custo UPDATE"
    ON public.centros_custo
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - centros_custo DELETE"
    ON public.centros_custo
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: GRUPOS
-- =====================================================

CREATE POLICY "Isolamento por empresa - grupos SELECT"
    ON public.grupos
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - grupos INSERT"
    ON public.grupos
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - grupos UPDATE"
    ON public.grupos
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - grupos DELETE"
    ON public.grupos
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: ITENS_ORCAMENTO
-- =====================================================

CREATE POLICY "Isolamento por empresa - itens_orcamento SELECT"
    ON public.itens_orcamento
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_orcamento INSERT"
    ON public.itens_orcamento
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_orcamento UPDATE"
    ON public.itens_orcamento
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_orcamento DELETE"
    ON public.itens_orcamento
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- =====================================================
-- POLÍTICAS RLS: ITENS_CUSTO
-- =====================================================

CREATE POLICY "Isolamento por empresa - itens_custo SELECT"
    ON public.itens_custo
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_custo INSERT"
    ON public.itens_custo
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_custo UPDATE"
    ON public.itens_custo
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_custo DELETE"
    ON public.itens_custo
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- =====================================================
-- POLÍTICAS RLS: FORNECEDORES
-- =====================================================

CREATE POLICY "Isolamento por empresa - fornecedores SELECT"
    ON public.fornecedores
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - fornecedores INSERT"
    ON public.fornecedores
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - fornecedores UPDATE"
    ON public.fornecedores
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - fornecedores DELETE"
    ON public.fornecedores
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: NEGOCIACOES
-- =====================================================

CREATE POLICY "Isolamento por empresa - negociacoes SELECT"
    ON public.negociacoes
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - negociacoes INSERT"
    ON public.negociacoes
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - negociacoes UPDATE"
    ON public.negociacoes
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - negociacoes DELETE"
    ON public.negociacoes
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: ITENS_NEGOCIACAO
-- =====================================================

CREATE POLICY "Isolamento por empresa - itens_negociacao SELECT"
    ON public.itens_negociacao
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_negociacao INSERT"
    ON public.itens_negociacao
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_negociacao UPDATE"
    ON public.itens_negociacao
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_negociacao DELETE"
    ON public.itens_negociacao
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- =====================================================
-- POLÍTICAS RLS: MEDICOES
-- =====================================================

CREATE POLICY "Isolamento por empresa - medicoes SELECT"
    ON public.medicoes
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - medicoes INSERT"
    ON public.medicoes
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - medicoes UPDATE"
    ON public.medicoes
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - medicoes DELETE"
    ON public.medicoes
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: ITENS_MEDICAO
-- =====================================================

CREATE POLICY "Isolamento por empresa - itens_medicao SELECT"
    ON public.itens_medicao
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_medicao INSERT"
    ON public.itens_medicao
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_medicao UPDATE"
    ON public.itens_medicao
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_medicao DELETE"
    ON public.itens_medicao
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- =====================================================
-- POLÍTICAS RLS: PEDIDOS_COMPRA
-- =====================================================

CREATE POLICY "Isolamento por empresa - pedidos_compra SELECT"
    ON public.pedidos_compra
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - pedidos_compra INSERT"
    ON public.pedidos_compra
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - pedidos_compra UPDATE"
    ON public.pedidos_compra
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - pedidos_compra DELETE"
    ON public.pedidos_compra
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: ITENS_PEDIDO_COMPRA
-- =====================================================

CREATE POLICY "Isolamento por empresa - itens_pedido_compra SELECT"
    ON public.itens_pedido_compra
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_pedido_compra INSERT"
    ON public.itens_pedido_compra
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_pedido_compra UPDATE"
    ON public.itens_pedido_compra
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - itens_pedido_compra DELETE"
    ON public.itens_pedido_compra
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- =====================================================
-- POLÍTICAS RLS: PARCELAS_PAGAMENTO
-- =====================================================

CREATE POLICY "Isolamento por empresa - parcelas_pagamento SELECT"
    ON public.parcelas_pagamento
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_pagamento INSERT"
    ON public.parcelas_pagamento
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_pagamento UPDATE"
    ON public.parcelas_pagamento
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_pagamento DELETE"
    ON public.parcelas_pagamento
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- =====================================================
-- POLÍTICAS RLS: PARCELAS_PEDIDO_COMPRA
-- =====================================================

CREATE POLICY "Isolamento por empresa - parcelas_pedido_compra SELECT"
    ON public.parcelas_pedido_compra
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_pedido_compra INSERT"
    ON public.parcelas_pedido_compra
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_pedido_compra UPDATE"
    ON public.parcelas_pedido_compra
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_pedido_compra DELETE"
    ON public.parcelas_pedido_compra
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- =====================================================
-- POLÍTICAS RLS: PARCELAS_MEDICAO
-- =====================================================

CREATE POLICY "Isolamento por empresa - parcelas_medicao SELECT"
    ON public.parcelas_medicao
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_medicao INSERT"
    ON public.parcelas_medicao
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_medicao UPDATE"
    ON public.parcelas_medicao
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_medicao DELETE"
    ON public.parcelas_medicao
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- =====================================================
-- POLÍTICAS RLS: OBRAS
-- =====================================================

CREATE POLICY "Isolamento por empresa - obras SELECT"
    ON public.obras
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - obras INSERT"
    ON public.obras
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - obras UPDATE"
    ON public.obras
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - obras DELETE"
    ON public.obras
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: CLIENTES
-- =====================================================

CREATE POLICY "Isolamento por empresa - clientes SELECT"
    ON public.clientes
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - clientes INSERT"
    ON public.clientes
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - clientes UPDATE"
    ON public.clientes
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - clientes DELETE"
    ON public.clientes
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin());

-- =====================================================
-- POLÍTICAS RLS: PARCELAS_RECEBER
-- =====================================================

CREATE POLICY "Isolamento por empresa - parcelas_receber SELECT"
    ON public.parcelas_receber
    FOR SELECT
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_receber INSERT"
    ON public.parcelas_receber
    FOR INSERT
    WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_receber UPDATE"
    ON public.parcelas_receber
    FOR UPDATE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

CREATE POLICY "Isolamento por empresa - parcelas_receber DELETE"
    ON public.parcelas_receber
    FOR DELETE
    USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa());

-- =====================================================
-- PARTE 7: DADOS INICIAIS (SEED)
-- =====================================================

-- Inserir planos iniciais
INSERT INTO public.planos (nome, descricao, preco_mensal, preco_anual, limite_usuarios, limite_obras, funcionalidades, ordem)
VALUES
    ('Gratuito', 'Plano gratuito com funcionalidades básicas', 0.00, 0.00, 2, 1, 
     '{"orcamento": true, "financeiro": false, "negociacoes": false, "medicoes": false}', 1),
    
    ('Básico', 'Ideal para pequenas construtoras', 99.90, 999.00, 5, 3,
     '{"orcamento": true, "financeiro": true, "negociacoes": true, "medicoes": false, "relatorios_basicos": true}', 2),
    
    ('Profissional', 'Para construtoras em crescimento', 249.90, 2499.00, 15, 10,
     '{"orcamento": true, "financeiro": true, "negociacoes": true, "medicoes": true, "relatorios_avancados": true, "integracao_api": false}', 3),
    
    ('Empresarial', 'Solução completa para grandes construtoras', 499.90, 4999.00, NULL, NULL,
     '{"orcamento": true, "financeiro": true, "negociacoes": true, "medicoes": true, "relatorios_avancados": true, "integracao_api": true, "suporte_prioritario": true, "multi_obras_ilimitadas": true}', 4)
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- PARTE 8: COMENTÁRIOS NAS TABELAS E COLUNAS
-- =====================================================

COMMENT ON TABLE public.empresas IS 'Tabela de empresas/organizações (tenants) do sistema SaaS';
COMMENT ON TABLE public.planos IS 'Planos de assinatura disponíveis no sistema';
COMMENT ON TABLE public.assinaturas IS 'Assinaturas ativas/históricas das empresas';

COMMENT ON COLUMN public.usuarios.empresa_id IS 'Empresa a qual o usuário pertence';
COMMENT ON COLUMN public.usuarios.role IS 'Papel do usuário: admin (pode gerenciar empresa e usuários), membro (pode usar o sistema), visualizador (apenas leitura)';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Para verificar se a migration foi aplicada corretamente:
-- SELECT * FROM public.empresas;
-- SELECT * FROM public.planos;
-- SELECT * FROM public.assinaturas;
