# Implementação Frontend Multitenant - Construtivo Obra

## Índice
1. [Context de Empresa](#context-de-empresa)
2. [Hooks Personalizados](#hooks-personalizados)
3. [Atualizar Cadastro/Login](#atualizar-cadastrlogin)
4. [Componentes de UI](#componentes-de-ui)
5. [Proteção de Rotas](#proteção-de-rotas)
6. [Exemplos de Uso](#exemplos-de-uso)

---

## Context de Empresa

### 1. Criar EmpresaContext

Arquivo: `src/contexts/EmpresaContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface Empresa {
  id: number;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  email: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  data_inicio_trial: string;
  data_fim_trial: string;
  configuracoes: Record<string, any>;
}

interface Plano {
  id: number;
  nome: string;
  preco_mensal: number;
  preco_anual: number;
  limite_usuarios: number | null;
  limite_obras: number | null;
  funcionalidades: Record<string, any>;
}

interface Assinatura {
  id: number;
  empresa_id: number;
  plano_id: number;
  data_inicio: string;
  data_fim: string | null;
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  periodicidade: 'mensal' | 'anual';
  plano: Plano;
}

interface EmpresaContextData {
  empresa: Empresa | null;
  assinatura: Assinatura | null;
  plano: Plano | null;
  loading: boolean;
  recarregar: () => Promise<void>;
  verificarLimite: (tipo: 'usuarios' | 'obras') => Promise<boolean>;
  diasRestantesTrial: number | null;
  isEmTrial: boolean;
  isAtiva: boolean;
}

const EmpresaContext = createContext<EmpresaContextData>({} as EmpresaContextData);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosEmpresa();
  }, []);

  async function carregarDadosEmpresa() {
    try {
      setLoading(true);

      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar dados do usuário
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuario?.empresa_id) {
        console.warn('Usuário sem empresa associada');
        return;
      }

      // Buscar empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', usuario.empresa_id)
        .single();

      if (empresaError) {
        console.error('Erro ao buscar empresa:', empresaError);
        return;
      }

      setEmpresa(empresaData);

      // Buscar assinatura ativa com dados do plano
      const { data: assinaturaData, error: assinaturaError } = await supabase
        .from('assinaturas')
        .select(`
          *,
          plano:planos(*)
        `)
        .eq('empresa_id', usuario.empresa_id)
        .eq('status', 'active')
        .single();

      if (assinaturaError) {
        console.warn('Nenhuma assinatura ativa encontrada');
        return;
      }

      setAssinatura(assinaturaData);
      setPlano(assinaturaData.plano);
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
    } finally {
      setLoading(false);
    }
  }

  async function verificarLimite(tipo: 'usuarios' | 'obras'): Promise<boolean> {
    if (!plano || !empresa) return false;

    const limite = tipo === 'usuarios' ? plano.limite_usuarios : plano.limite_obras;
    
    // NULL = ilimitado
    if (limite === null) return true;

    // Contar registros atuais
    const { count } = await supabase
      .from(tipo === 'usuarios' ? 'usuarios' : 'obras')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresa.id);

    return (count || 0) < limite;
  }

  const diasRestantesTrial = empresa && empresa.status === 'trial'
    ? Math.ceil((new Date(empresa.data_fim_trial).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isEmTrial = empresa?.status === 'trial';
  const isAtiva = empresa?.status === 'active' || empresa?.status === 'trial';

  return (
    <EmpresaContext.Provider 
      value={{ 
        empresa, 
        assinatura, 
        plano, 
        loading,
        recarregar: carregarDadosEmpresa,
        verificarLimite,
        diasRestantesTrial,
        isEmTrial,
        isAtiva
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export const useEmpresa = () => {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa deve ser usado dentro de um EmpresaProvider');
  }
  return context;
};
```

### 2. Adicionar Provider no Layout

Arquivo: `src/app/layout.tsx`

```typescript
import { EmpresaProvider } from '@/contexts/EmpresaContext';

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <EmpresaProvider>
            {children}
          </EmpresaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## Hooks Personalizados

### 1. usePermissao

Arquivo: `src/hooks/usePermissao.ts`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/contexts/EmpresaContext';

type Role = 'admin' | 'membro' | 'visualizador';

export function usePermissao() {
  const { empresa, isAtiva } = useEmpresa();
  const [role, setRole] = useState<Role>('membro');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarRole();
  }, []);

  async function carregarRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('usuarios')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setRole(data.role as Role);
      }
    } catch (error) {
      console.error('Erro ao carregar role:', error);
    } finally {
      setLoading(false);
    }
  }

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isMembro: role === 'membro',
    isVisualizador: role === 'visualizador',
    podeEditar: role !== 'visualizador' && isAtiva,
    podeDeletar: role === 'admin' && isAtiva,
    podeGerenciarUsuarios: role === 'admin',
    podeGerenciarAssinatura: role === 'admin',
    empresaAtiva: isAtiva,
  };
}
```

### 2. useUsuarios (para gerenciamento de equipe)

Arquivo: `src/hooks/useUsuarios.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/contexts/EmpresaContext';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'membro' | 'visualizador';
  ativo: boolean;
  cargo: string | null;
  avatar_url: string | null;
  data_convite: string | null;
  ultimo_acesso: string | null;
}

export function useUsuarios() {
  const { empresa } = useEmpresa();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empresa) {
      carregarUsuarios();
    }
  }, [empresa]);

  async function carregarUsuarios() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresa?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  }

  async function convidarUsuario(email: string, role: 'admin' | 'membro' | 'visualizador' = 'membro') {
    try {
      // Verificar limite de usuários
      const { verificarLimite } = useEmpresa();
      const podeCriar = await verificarLimite('usuarios');
      
      if (!podeCriar) {
        throw new Error('Limite de usuários do plano atingido');
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Criar usuário (requer permissão de admin no Supabase)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: false,
        user_metadata: {
          empresa_id: empresa?.id,
          convidado_por: currentUser?.id
        }
      });

      if (authError) throw authError;

      // Criar registro em usuarios
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          email: email,
          nome: email.split('@')[0], // Nome provisório
          empresa_id: empresa?.id,
          role: role,
          ativo: false,
          convidado_por: currentUser?.id,
          data_convite: new Date().toISOString()
        });

      if (usuarioError) throw usuarioError;

      await carregarUsuarios();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao convidar usuário:', error);
      return { success: false, error: error.message };
    }
  }

  async function removerUsuario(usuarioId: string) {
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', usuarioId);

      if (error) throw error;

      await carregarUsuarios();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao remover usuário:', error);
      return { success: false, error: error.message };
    }
  }

  async function alterarRole(usuarioId: string, novaRole: 'admin' | 'membro' | 'visualizador') {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ role: novaRole })
        .eq('id', usuarioId);

      if (error) throw error;

      await carregarUsuarios();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao alterar role:', error);
      return { success: false, error: error.message };
    }
  }

  return {
    usuarios,
    loading,
    carregarUsuarios,
    convidarUsuario,
    removerUsuario,
    alterarRole,
  };
}
```

---

## Atualizar Cadastro/Login

### 1. Página de Cadastro de Empresa

Arquivo: `src/app/(auth)/cadastro-empresa/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CadastroEmpresa() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    cnpj: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    nomeUsuario: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (formData.senha !== formData.confirmarSenha) {
        alert('As senhas não coincidem');
        return;
      }

      // 1. Criar empresa
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nome: formData.nomeEmpresa,
          cnpj: formData.cnpj,
          email: formData.email,
          status: 'trial',
          data_inicio_trial: new Date().toISOString(),
          data_fim_trial: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (empresaError) throw empresaError;

      // 2. Criar usuário admin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            nome: formData.nomeUsuario,
            empresa_id: empresa.id
          }
        }
      });

      if (authError) throw authError;

      // 3. Atualizar registro de usuário com empresa e role
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          empresa_id: empresa.id,
          role: 'admin',
          ativo: true,
          data_ativacao: new Date().toISOString()
        })
        .eq('id', authData.user?.id);

      if (updateError) throw updateError;

      // 4. Criar assinatura trial (plano gratuito)
      const { data: planoGratuito } = await supabase
        .from('planos')
        .select('id')
        .eq('nome', 'Gratuito')
        .single();

      await supabase
        .from('assinaturas')
        .insert({
          empresa_id: empresa.id,
          plano_id: planoGratuito.id,
          data_inicio: new Date().toISOString(),
          status: 'active',
          periodicidade: 'mensal',
          valor_mensal: 0
        });

      // Redirecionar para dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Erro ao cadastrar:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">Cadastre sua Empresa</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">Nome da Empresa</label>
          <input
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.nomeEmpresa}
            onChange={(e) => setFormData({...formData, nomeEmpresa: e.target.value})}
          />
        </div>

        <div>
          <label className="block mb-2">CNPJ</label>
          <input
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.cnpj}
            onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
          />
        </div>

        <div>
          <label className="block mb-2">Email</label>
          <input
            type="email"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>

        <div>
          <label className="block mb-2">Seu Nome</label>
          <input
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.nomeUsuario}
            onChange={(e) => setFormData({...formData, nomeUsuario: e.target.value})}
          />
        </div>

        <div>
          <label className="block mb-2">Senha</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full border rounded px-3 py-2"
            value={formData.senha}
            onChange={(e) => setFormData({...formData, senha: e.target.value})}
          />
        </div>

        <div>
          <label className="block mb-2">Confirmar Senha</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full border rounded px-3 py-2"
            value={formData.confirmarSenha}
            onChange={(e) => setFormData({...formData, confirmarSenha: e.target.value})}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Criando conta...' : 'Criar Conta - Trial 15 dias grátis'}
        </button>
      </form>
    </div>
  );
}
```

---

## Componentes de UI

### 1. Banner de Trial

Arquivo: `src/components/layout/BannerTrial.tsx`

```typescript
'use client';

import { useEmpresa } from '@/contexts/EmpresaContext';
import Link from 'next/link';

export function BannerTrial() {
  const { empresa, isEmTrial, diasRestantesTrial } = useEmpresa();

  if (!isEmTrial || !diasRestantesTrial) return null;

  return (
    <div className="bg-yellow-500 text-white px-4 py-2 text-center">
      <p>
        <strong>Trial:</strong> Restam {diasRestantesTrial} dias no seu período de teste.{' '}
        <Link href="/planos" className="underline font-bold">
          Escolha um plano agora
        </Link>
      </p>
    </div>
  );
}
```

### 2. Card de Informações da Empresa

Arquivo: `src/components/empresa/InfoEmpresa.tsx`

```typescript
'use client';

import { useEmpresa } from '@/contexts/EmpresaContext';

export function InfoEmpresa() {
  const { empresa, plano, assinatura, loading } = useEmpresa();

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Informações da Empresa</h2>
      
      <div className="space-y-2">
        <p><strong>Nome:</strong> {empresa?.nome}</p>
        <p><strong>Email:</strong> {empresa?.email}</p>
        {empresa?.cnpj && <p><strong>CNPJ:</strong> {empresa.cnpj}</p>}
        <p><strong>Status:</strong> 
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            empresa?.status === 'active' ? 'bg-green-100 text-green-800' :
            empresa?.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {empresa?.status === 'active' ? 'Ativa' :
             empresa?.status === 'trial' ? 'Trial' :
             empresa?.status === 'suspended' ? 'Suspensa' : 'Cancelada'}
          </span>
        </p>
        
        {plano && (
          <>
            <p><strong>Plano:</strong> {plano.nome}</p>
            <p><strong>Usuários:</strong> {plano.limite_usuarios || 'Ilimitado'}</p>
            <p><strong>Obras:</strong> {plano.limite_obras || 'Ilimitado'}</p>
          </>
        )}
      </div>
    </div>
  );
}
```

### 3. Lista de Usuários da Equipe

Arquivo: `src/components/equipe/ListaUsuarios.tsx`

```typescript
'use client';

import { useUsuarios } from '@/hooks/useUsuarios';
import { usePermissao } from '@/hooks/usePermissao';
import { useState } from 'react';

export function ListaUsuarios() {
  const { usuarios, loading, convidarUsuario, removerUsuario, alterarRole } = useUsuarios();
  const { podeGerenciarUsuarios } = usePermissao();
  const [emailConvite, setEmailConvite] = useState('');
  const [roleConvite, setRoleConvite] = useState<'admin' | 'membro' | 'visualizador'>('membro');

  async function handleConvidar() {
    const resultado = await convidarUsuario(emailConvite, roleConvite);
    if (resultado.success) {
      alert('Usuário convidado com sucesso!');
      setEmailConvite('');
    } else {
      alert(`Erro: ${resultado.error}`);
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Equipe</h2>

      {podeGerenciarUsuarios && (
        <div className="bg-gray-50 p-4 rounded mb-6">
          <h3 className="font-bold mb-3">Convidar Novo Usuário</h3>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email do usuário"
              className="flex-1 border rounded px-3 py-2"
              value={emailConvite}
              onChange={(e) => setEmailConvite(e.target.value)}
            />
            <select
              className="border rounded px-3 py-2"
              value={roleConvite}
              onChange={(e) => setRoleConvite(e.target.value as any)}
            >
              <option value="membro">Membro</option>
              <option value="visualizador">Visualizador</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleConvidar}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Convidar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {usuarios.map((usuario) => (
          <div key={usuario.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <p className="font-bold">{usuario.nome}</p>
              <p className="text-sm text-gray-600">{usuario.email}</p>
              <span className={`text-xs px-2 py-1 rounded ${
                usuario.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                usuario.role === 'membro' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {usuario.role}
              </span>
            </div>
            
            {podeGerenciarUsuarios && (
              <div className="flex gap-2">
                <button
                  onClick={() => alterarRole(usuario.id, 'admin')}
                  className="text-sm text-blue-600 hover:underline"
                  disabled={usuario.role === 'admin'}
                >
                  Tornar Admin
                </button>
                <button
                  onClick={() => removerUsuario(usuario.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Proteção de Rotas

### Middleware para Verificar Status da Empresa

Arquivo: `src/middleware.ts`

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirecionar para login se não autenticado
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Se autenticado, verificar status da empresa
  if (session) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', session.user.id)
      .single();

    if (usuario?.empresa_id) {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('status')
        .eq('id', usuario.empresa_id)
        .single();

      // Se empresa suspensa, redirecionar para página de renovação
      if (empresa?.status === 'suspended' && !req.nextUrl.pathname.startsWith('/renovar')) {
        return NextResponse.redirect(new URL('/renovar-assinatura', req.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Exemplos de Uso

### Exemplo 1: Criar Obra (com empresa_id automático)

```typescript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { usePermissao } from '@/hooks/usePermissao';

export default function NovaObra() {
  const { empresa, verificarLimite } = useEmpresa();
  const { podeEditar } = usePermissao();
  const [nome, setNome] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Verificar limite de obras
    const podeCriar = await verificarLimite('obras');
    if (!podeCriar) {
      alert('Limite de obras do seu plano atingido. Faça upgrade!');
      return;
    }

    const { error } = await supabase
      .from('obras')
      .insert({
        nome: nome,
        empresa_id: empresa?.id, // Obrigatório!
        status: 'Em andamento'
      });

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      alert('Obra criada com sucesso!');
      setNome('');
    }
  }

  if (!podeEditar) {
    return <p>Você não tem permissão para criar obras.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da obra"
        required
      />
      <button type="submit">Criar Obra</button>
    </form>
  );
}
```

### Exemplo 2: Listar Obras (filtro automático por RLS)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ListaObras() {
  const [obras, setObras] = useState([]);

  useEffect(() => {
    carregarObras();
  }, []);

  async function carregarObras() {
    // O RLS filtra automaticamente apenas obras da empresa do usuário
    const { data } = await supabase
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false });

    setObras(data || []);
  }

  return (
    <div>
      <h2>Obras</h2>
      {obras.map((obra: any) => (
        <div key={obra.id}>
          <h3>{obra.nome}</h3>
          <p>Status: {obra.status}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Checklist de Implementação

- [ ] Aplicar migration SQL no Supabase
- [ ] Criar `EmpresaContext.tsx`
- [ ] Criar hook `usePermissao`
- [ ] Criar hook `useUsuarios`
- [ ] Criar página de cadastro de empresa
- [ ] Adicionar `empresa_id` em todos os inserts
- [ ] Criar componente `BannerTrial`
- [ ] Criar componente `InfoEmpresa`
- [ ] Criar componente `ListaUsuarios`
- [ ] Criar página de gerenciamento de equipe
- [ ] Criar página de planos
- [ ] Implementar upgrade de plano
- [ ] Testar isolamento com múltiplas empresas
- [ ] Implementar integração de pagamento (Stripe/PagSeguro)

---

**Próximo Passo**: Aplicar a migration no Supabase e começar a implementar o frontend!
