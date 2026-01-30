"use client";

import { useState, useEffect } from 'react';
import { X, User, FileText, Phone, Mail, MapPin } from 'lucide-react';
import { insertCliente, gerarProximoCodigoCliente } from '@/lib/supabase-clientes';

interface ModalNovoClienteProps {
  onClose: () => void;
  onSuccess: (cliente?: { nome: string }) => void;
}

export default function ModalNovoCliente({ onClose, onSuccess }: ModalNovoClienteProps) {
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'Pessoa Física' | 'Pessoa Jurídica' | 'Investidor'>('Pessoa Física');
  const [documento, setDocumento] = useState('');
  const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarProximoCodigo();
  }, []);

  const carregarProximoCodigo = async () => {
    const proximoCodigo = await gerarProximoCodigoCliente();
    setCodigo(proximoCodigo);
  };

  const formatarDocumento = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');

    if (tipo === 'Pessoa Física') {
      if (numeros.length <= 11) {
        return numeros
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      }
    } else {
      if (numeros.length <= 14) {
        return numeros
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1/$2')
          .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
      }
    }

    return valor;
  };

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');

    if (numeros.length <= 11) {
      return numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }

    return valor;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !documento) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const clienteCadastrado = await insertCliente(
        codigo,
        nome,
        tipo,
        documento,
        contato,
        telefone,
        email,
        endereco,
        observacoes
      );

      onSuccess({ nome: clienteCadastrado.nome });
      onClose();
    } catch (error: any) {
      console.error('Erro ao cadastrar cliente:', error);
      if (error.message?.includes('duplicate key')) {
        alert('Já existe um cliente com este documento');
      } else {
        alert('Erro ao cadastrar cliente. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Novo Cliente/Investidor</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText size={18} />
              Informações Básicas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Código *</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  readOnly
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo *</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'Pessoa Física' | 'Pessoa Jurídica' | 'Investidor')}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="Pessoa Física">Pessoa Física</option>
                  <option value="Pessoa Jurídica">Pessoa Jurídica</option>
                  <option value="Investidor">Investidor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome Completo / Razão Social *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome completo ou razão social"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {tipo === 'Pessoa Física' ? 'CPF *' : 'CNPJ *'}
              </label>
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(formatarDocumento(e.target.value))}
                placeholder={tipo === 'Pessoa Física' ? '000.000.000-00' : '00.000.000/0000-00'}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Phone size={18} />
              Contato
            </h3>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome do Contato</label>
              <input
                type="text"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder="Nome da pessoa de contato"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Telefone</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <MapPin size={18} />
              Endereço
            </h3>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Endereço Completo</label>
              <textarea
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais sobre o cliente"
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
