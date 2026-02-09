"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, ArrowLeft, Save } from 'lucide-react';
import { fetchFornecedorById, updateFornecedor } from '@/lib/supabase';

// Definindo a interface para os parâmetros da rota
interface PageParams {
  id: string;
}

export default function EditarFornecedorPage({ params }: any) {
  // Usando React.use() para acessar os parâmetros, conforme exigido pelo Next.js 15
  const resolvedParams = React.use(params) as PageParams;
  const id = parseInt(resolvedParams.id);
  
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [loadingFornecedor, setLoadingFornecedor] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    contato: '',
    telefone: '',
    email: ''
  });

  const formatarDocumento = (valor: string) => {
    // Permite a palavra "isento" (case-insensitive)
    const valorLower = valor.toLowerCase().trim();
    if (valorLower === 'isento' || (valorLower.startsWith('isento') && !/\d/.test(valor))) {
      return 'ISENTO';
    }

    // Remove todos os caracteres não numéricos
    const numeros = valor.replace(/\D/g, '');

    // Se não houver números, retorna vazio
    if (!numeros) return '';

    // CPF: 11 dígitos - formato 000.000.000-00
    if (numeros.length <= 11) {
      return numeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    
    // CNPJ: 14 dígitos - formato 00.000.000/0000-00
    if (numeros.length <= 14) {
      return numeros
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }

    // Se exceder 14 dígitos, mantém apenas os primeiros 14 formatados
    const numerosLimitados = numeros.substring(0, 14);
    return numerosLimitados
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const formatarTelefone = (valor: string) => {
    // Remove todos os caracteres não numéricos
    const numeros = valor.replace(/\D/g, '');

    // Se não houver números, retorna vazio
    if (!numeros) return '';

    // Telefone fixo: 10 dígitos - formato (00) 0000-0000
    if (numeros.length <= 10) {
      return numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }

    // Celular: 11 dígitos - formato (00) 00000-0000
    if (numeros.length <= 11) {
      return numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }

    // Se exceder 11 dígitos, mantém apenas os primeiros 11 formatados
    const numerosLimitados = numeros.substring(0, 11);
    return numerosLimitados
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  useEffect(() => {
    const carregarFornecedor = async () => {
      setLoadingFornecedor(true);
      try {
        const fornecedor = await fetchFornecedorById(id);
        if (fornecedor) {
          setFormData({
            nome: fornecedor.nome,
            documento: fornecedor.documento ? formatarDocumento(fornecedor.documento) : '',
            contato: fornecedor.contato || '',
            telefone: fornecedor.telefone ? formatarTelefone(fornecedor.telefone) : '',
            email: fornecedor.email || ''
          });
        } else {
          alert('Fornecedor não encontrado');
          router.push('/fornecedores');
        }
      } catch (error) {
        console.error('Erro ao carregar fornecedor:', error);
        alert('Erro ao carregar dados do fornecedor');
        router.push('/fornecedores');
      } finally {
        setLoadingFornecedor(false);
      }
    };

    carregarFornecedor();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Aplicar máscaras específicas
    if (name === 'documento') {
      finalValue = formatarDocumento(value);
    } else if (name === 'telefone') {
      finalValue = formatarTelefone(value);
    }

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
      await updateFornecedor(
        id,
        formData.nome,
        formData.documento,
        formData.contato || undefined,
        formData.telefone || undefined,
        formData.email || undefined
      );
      
      router.push('/fornecedores');
      router.refresh();
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      alert('Erro ao atualizar fornecedor. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingFornecedor) {
    return (
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link 
            href="/fornecedores" 
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">EDITAR FORNECEDOR</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-gray-500">Carregando dados do fornecedor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Link 
          href="/fornecedores" 
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 active:bg-blue-100"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold">EDITAR FORNECEDOR</h1>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <User size={32} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold">Edição de Fornecedor</h2>
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
                className="w-full min-h-[48px] md:min-h-0 px-4 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                placeholder="000.000.000-00, 00.000.000/0000-00 ou ISENTO"
                className="w-full min-h-[48px] md:min-h-0 px-4 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                className="w-full min-h-[48px] md:min-h-0 px-4 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                className="w-full min-h-[48px] md:min-h-0 px-4 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                className="w-full min-h-[48px] md:min-h-0 px-4 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end md:gap-4 pt-4">
            <Link 
              href="/fornecedores" 
              className="w-full md:w-auto min-h-[48px] md:min-h-0 flex items-center justify-center px-4 py-3 md:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors active:bg-gray-200"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto min-h-[48px] md:min-h-0 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 md:py-2 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed active:bg-blue-700"
            >
              <Save size={18} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 md:mt-8 bg-white shadow-sm rounded-lg p-4 md:p-6 max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-3">Informações Importantes</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-600">
          <li>Os campos marcados com <span className="text-red-500">*</span> são obrigatórios.</li>
          <li>O CPF/CNPJ será formatado automaticamente. Você pode digitar apenas os números ou digitar "ISENTO" quando aplicável.</li>
          <li>O telefone/celular será formatado automaticamente conforme o número de dígitos informados.</li>
          <li>Certifique-se de informar um e-mail válido para comunicações.</li>
        </ul>
      </div>
    </main>
  );
} 