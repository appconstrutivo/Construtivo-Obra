'use client';

import { useState, useEffect } from 'react';
import { X, Shield, Loader2 } from 'lucide-react';
import {
  ROLES,
  MODULOS,
  ACOES,
  getDefaultPermissoesByRole,
  normalizarPermissoes,
  type Role,
  type PermissoesUsuario,
  type AcaoPermissao,
} from '@/lib/permissoes';

type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  cargo: string | null;
  avatar_url: string | null;
  permissoes?: PermissoesUsuario | null;
};

type Props = {
  usuario: Usuario;
  onSalvar: (usuarioId: string, role: Role, permissoes: PermissoesUsuario | null) => Promise<void>;
  onFechar: () => void;
  carregando?: boolean;
};

export default function ModalPermissoesUsuario({ usuario, onSalvar, onFechar, carregando: carregandoExterno }: Props) {
  const permissoesInicial = usuario.permissoes ?? null;
  const [role, setRole] = useState<Role>(usuario.role);
  const [personalizar, setPersonalizar] = useState<boolean>(!!permissoesInicial && Object.keys(permissoesInicial).length > 0);
  const [permissoes, setPermissoes] = useState<PermissoesUsuario>(() =>
    permissoesInicial && Object.keys(permissoesInicial).length > 0
      ? normalizarPermissoes(permissoesInicial)!
      : getDefaultPermissoesByRole(usuario.role)
  );
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!personalizar) {
      setPermissoes(getDefaultPermissoesByRole(role));
    }
  }, [role, personalizar]);

  const handleTogglePersonalizar = () => {
    const next = !personalizar;
    setPersonalizar(next);
    if (next) {
      setPermissoes(getDefaultPermissoesByRole(role));
    }
  };

  const handleTogglePermissao = (moduloId: string, acao: AcaoPermissao) => {
    if (!personalizar) return;
    setPermissoes((prev) => ({
      ...prev,
      [moduloId]: {
        ...prev[moduloId],
        [acao]: !prev[moduloId]?.[acao],
      },
    }));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(
        usuario.id,
        role,
        personalizar ? normalizarPermissoes(permissoes) : null
      );
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  const loading = salvando || carregandoExterno;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">{usuario.nome.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Permissões do usuário</h3>
              <p className="text-sm text-gray-500">{usuario.nome} · {usuario.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Perfil (role) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Perfil de acesso</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full max-w-xs rounded-lg border border-gray-300 py-2.5 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">{ROLES.find((r) => r.value === role)?.description}</p>
          </div>

          {/* Toggle personalizar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={personalizar}
              onClick={handleTogglePersonalizar}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                personalizar ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                  personalizar ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">Personalizar permissões por módulo</span>
          </div>

          {/* Matriz de permissões */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Shield size={16} />
              Permissões por módulo
            </h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-medium text-gray-700">Módulo</th>
                      {ACOES.map((a) => (
                        <th key={a.id} className="py-2.5 px-2 text-center font-medium text-gray-700">{a.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {MODULOS.map((mod) => (
                      <tr key={mod.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 text-gray-900">
                          <div className="font-medium">{mod.label}</div>
                          {mod.desc && <div className="text-xs text-gray-500">{mod.desc}</div>}
                        </td>
                        {ACOES.map((acao) => (
                          <td key={acao.id} className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!permissoes[mod.id]?.[acao.id]}
                              onChange={() => handleTogglePermissao(mod.id, acao.id)}
                              disabled={!personalizar}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {!personalizar && (
              <p className="mt-2 text-xs text-gray-500">
                As permissões acima seguem o perfil selecionado. Ative &quot;Personalizar permissões por módulo&quot; para ajustar por usuário.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50/50">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Salvar permissões
          </button>
        </div>
      </div>
    </div>
  );
}
