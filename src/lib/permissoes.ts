/**
 * Permissões granulares por módulo do sistema.
 * Usado na seção Usuários e Permissões para definir o que cada usuário pode fazer.
 * Se usuario.permissoes for null, aplicam-se os defaults do role.
 */

export type Role = 'admin' | 'membro' | 'visualizador';

export const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'admin', label: 'Administrador', description: 'Acesso total, incluindo exclusões e gerenciamento de usuários' },
  { value: 'membro', label: 'Membro', description: 'Visualizar, criar e editar; sem excluir em módulos sensíveis' },
  { value: 'visualizador', label: 'Visualizador', description: 'Apenas visualização em todos os módulos' },
];

/** Chaves de permissão por ação */
export type AcaoPermissao = 'ver' | 'criar' | 'editar' | 'excluir';

/** Permissões de um módulo (todas boolean) */
export type PermissoesModulo = Record<AcaoPermissao, boolean>;

/** Mapa módulo -> permissões */
export type PermissoesUsuario = Record<string, PermissoesModulo>;

/** Módulos do sistema alinhados ao menu e RLS */
export const MODULOS = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Visão geral e indicadores' },
  { id: 'financeiro', label: 'Controle de Insumo', desc: 'Etapas, grupos e itens de custo' },
  { id: 'medicoes', label: 'Medições', desc: 'Boletins de medição' },
  { id: 'compras', label: 'Compras', desc: 'Pedidos de compra' },
  { id: 'contas_a_pagar', label: 'Contas a Pagar', desc: 'Vencimentos e desembolso' },
  { id: 'contas_a_receber', label: 'Contas a Receber', desc: 'Receitas e recebimentos' },
  { id: 'negociacoes', label: 'Contratos', desc: 'Negociações e contratos' },
  { id: 'fornecedores', label: 'Fornecedores', desc: 'Cadastro de fornecedores' },
  { id: 'relatorios', label: 'Relatórios', desc: 'Relatórios e exportações' },
  { id: 'orcamento', label: 'Orçamento', desc: 'Orçamento da obra' },
  { id: 'configuracoes', label: 'Configurações', desc: 'Configurações e usuários da empresa' },
] as const;

export const ACOES: { id: AcaoPermissao; label: string }[] = [
  { id: 'ver', label: 'Ver' },
  { id: 'criar', label: 'Criar' },
  { id: 'editar', label: 'Editar' },
  { id: 'excluir', label: 'Excluir' },
];

/** Default por role (quando usuario.permissoes é null) */
function getDefaultsByRole(role: Role): PermissoesUsuario {
  const base: PermissoesModulo = {
    ver: true,
    criar: role === 'visualizador' ? false : true,
    editar: role === 'visualizador' ? false : true,
    excluir: role === 'admin' ? true : false,
  };

  const resultado: PermissoesUsuario = {};
  MODULOS.forEach((m) => {
    resultado[m.id] = { ...base };
  });

  // Visualizador: só ver em tudo
  if (role === 'visualizador') {
    MODULOS.forEach((m) => {
      resultado[m.id] = { ver: true, criar: false, editar: false, excluir: false };
    });
  }

  // Configurações: apenas admin pode ter acesso completo (gerenciar usuários)
  resultado.configuracoes = {
    ver: role === 'admin',
    criar: role === 'admin',
    editar: role === 'admin',
    excluir: role === 'admin',
  };
  if (role === 'membro' || role === 'visualizador') {
    resultado.configuracoes = { ver: true, criar: false, editar: false, excluir: false }; // pode ver própria conta/config
  }

  return resultado;
}

const cacheDefaults: Record<Role, PermissoesUsuario> = {
  admin: getDefaultsByRole('admin'),
  membro: getDefaultsByRole('membro'),
  visualizador: getDefaultsByRole('visualizador'),
};

/**
 * Retorna as permissões efetivas do usuário: se tiver permissoes customizadas, usa; senão usa o default do role.
 */
export function getPermissoesEfetivas(
  role: Role,
  permissoesCustom: PermissoesUsuario | null
): PermissoesUsuario {
  if (permissoesCustom && typeof permissoesCustom === 'object') {
    const base = cacheDefaults[role];
    const merged: PermissoesUsuario = {};
    MODULOS.forEach((m) => {
      merged[m.id] = {
        ver: permissoesCustom[m.id]?.ver ?? base[m.id]?.ver ?? false,
        criar: permissoesCustom[m.id]?.criar ?? base[m.id]?.criar ?? false,
        editar: permissoesCustom[m.id]?.editar ?? base[m.id]?.editar ?? false,
        excluir: permissoesCustom[m.id]?.excluir ?? base[m.id]?.excluir ?? false,
      };
    });
    return merged;
  }
  return cacheDefaults[role];
}

/**
 * Retorna o default de permissões para um role (para exibir na matriz ao editar).
 */
export function getDefaultPermissoesByRole(role: Role): PermissoesUsuario {
  return cacheDefaults[role];
}

/**
 * Garante que o objeto permissoes tem todos os módulos (para salvar no banco).
 */
export function normalizarPermissoes(permissoes: PermissoesUsuario | null): PermissoesUsuario | null {
  if (!permissoes || typeof permissoes !== 'object') return null;
  const defaults = cacheDefaults.membro; // base para preencher faltantes
  const out: PermissoesUsuario = {};
  MODULOS.forEach((m) => {
    out[m.id] = {
      ver: permissoes[m.id]?.ver ?? defaults[m.id]?.ver ?? false,
      criar: permissoes[m.id]?.criar ?? defaults[m.id]?.criar ?? false,
      editar: permissoes[m.id]?.editar ?? defaults[m.id]?.editar ?? false,
      excluir: permissoes[m.id]?.excluir ?? defaults[m.id]?.excluir ?? false,
    };
  });
  return out;
}

export function getRoleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    membro: 'bg-blue-100 text-blue-800',
    visualizador: 'bg-gray-100 text-gray-800',
  };
  return colors[role] ?? 'bg-gray-100 text-gray-800';
}
