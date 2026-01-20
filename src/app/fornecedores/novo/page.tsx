"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, ArrowLeft, Save } from 'lucide-react';
import { insertFornecedor } from '@/lib/supabase';

export default function NovoFornecedorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    contato: '',
    telefone: '',
    email: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Converter para maiúsculas se for o campo "nome"
    const finalValue = name === 'nome' ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.documento) {
      alert('Por favor, preencha os campos obrigatórios');
      return;
    }
    
    setLoading(true);
    
    try {
      await insertFornecedor(
        formData.nome,
        formData.documento,
        formData.contato || undefined,
        formData.telefone || undefined,
        formData.email || undefined
      );
      
      router.push('/fornecedores');
      router.refresh();
    } catch (error) {
      console.error('Erro ao cadastrar fornecedor:', error);
      alert('Erro ao cadastrar fornecedor. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Link 
          href="/fornecedores" 
          className="text-blue-500 hover:text-blue-700"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">NOVO FORNECEDOR</h1>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <User size={32} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold">Cadastro de Fornecedor</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="nome" className="block text-sm font-medium">
                Nome / Razão Social<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Nome completo ou razão social"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="documento" className="block text-sm font-medium">
                CPF / CNPJ<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="documento"
                name="documento"
                value={formData.documento}
                onChange={handleChange}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="telefone" className="block text-sm font-medium">
                Telefone / Celular
              </label>
              <input
                type="text"
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                E-mail
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="exemplo@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="contato" className="block text-sm font-medium">
                Nome do Contato
              </label>
              <input
                type="text"
                id="contato"
                name="contato"
                value={formData.contato}
                onChange={handleChange}
                placeholder="Nome da pessoa de contato"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Link 
              href="/fornecedores" 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span>Salvar Fornecedor</span>
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-white shadow-sm rounded-lg p-6 max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-3">Informações Importantes</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-600">
          <li>Os campos marcados com <span className="text-red-500">*</span> são obrigatórios.</li>
          <li>O CPF/CNPJ deve ser informado sem pontos ou traços.</li>
          <li>Certifique-se de informar um e-mail válido para comunicações.</li>
        </ul>
      </div>
    </main>
  );
} 