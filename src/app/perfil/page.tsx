'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Camera, Loader2 } from 'lucide-react';

type PerfilUsuario = {
  id: string;
  nome: string;
  email: string;
  cargo?: string;
  empresa?: string;
  avatar_url?: string;
};

export default function PerfilPage() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Carregar dados do perfil
  useEffect(() => {
    async function carregarPerfil() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        setPerfil(data);
        setAvatarUrl(data.avatar_url || null);
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      } finally {
        setCarregando(false);
      }
    }

    carregarPerfil();
  }, [user]);

  // Função para atualizar o perfil
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfil || !user) return;

    setSalvando(true);
    setMensagem(null);

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: perfil.nome,
          cargo: perfil.cargo,
          empresa: perfil.empresa,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao atualizar perfil' });
    } finally {
      setSalvando(false);
    }
  };

  // Função para upload de avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) {
      return;
    }

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}.${fileExt}`;

    setUploading(true);

    try {
      // Upload do arquivo para o storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Obter a URL pública do arquivo
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = data.publicUrl;

      // Atualizar o perfil com a URL do avatar
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(avatarUrl);
      setMensagem({ tipo: 'sucesso', texto: 'Avatar atualizado com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao fazer upload do avatar:', error);
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao fazer upload do avatar' });
    } finally {
      setUploading(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">Erro ao carregar dados do perfil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-blue-100">Gerencie suas informações pessoais</p>
        </div>

        {mensagem && (
          <div className={`p-4 ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {mensagem.texto}
          </div>
        )}

        <div className="p-6">
          <div className="mb-8 flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600">
                    <span className="text-4xl font-bold">
                      {perfil.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-blue-700 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={uploading}
              />
            </div>
            <h2 className="text-xl font-semibold">{perfil.nome}</h2>
            <p className="text-gray-500">{perfil.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <input
                id="nome"
                type="text"
                value={perfil.nome}
                onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={perfil.email}
                disabled
                className="block w-full rounded-md border border-gray-300 py-2 px-3 bg-gray-50 shadow-sm"
              />
              <p className="mt-1 text-xs text-gray-500">O email não pode ser alterado</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  id="empresa"
                  type="text"
                  value={perfil.empresa || ''}
                  onChange={(e) => setPerfil({ ...perfil, empresa: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
              </div>

              <div>
                <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <input
                  id="cargo"
                  type="text"
                  value={perfil.cargo || ''}
                  onChange={(e) => setPerfil({ ...perfil, cargo: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={salvando}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center space-x-2 disabled:opacity-70"
              >
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{salvando ? 'Salvando...' : 'Salvar alterações'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 