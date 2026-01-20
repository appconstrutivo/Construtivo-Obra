import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import ModalNovoCliente from '@/components/contas-a-receber/ModalNovoCliente';

type FormularioObraProps = {
  onSalvar: (dados: ObraFormData) => Promise<void>;
  onCancelar: () => void;
  carregando?: boolean;
  obra?: ObraFormData;
};

export type ObraFormData = {
  nome: string;
  endereco: string;
  responsavel_tecnico: string;
  crea: string;
  data_inicio: string;
  data_prevista_fim: string;
  area_construida: number;
  status: string;
  observacoes: string;
  cliente: string;
};

export default function FormularioObra({ onSalvar, onCancelar, carregando = false, obra }: FormularioObraProps) {
  const [formData, setFormData] = useState<ObraFormData>(
    obra || {
      nome: '',
      endereco: '',
      responsavel_tecnico: '',
      crea: '',
      data_inicio: '',
      data_prevista_fim: '',
      area_construida: 0,
      status: 'Em andamento',
      observacoes: '',
      cliente: ''
    }
  );
  const [modalNovoClienteAberto, setModalNovoClienteAberto] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'area_construida' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSalvar(formData);
  };

  return (
    <div className="bg-white rounded-lg">
      <div className="bg-blue-600 p-4 text-white rounded-t-lg">
        <h3 className="text-xl font-semibold">Cadastrar Nova Obra</h3>
        <p className="text-blue-100 text-sm">Preencha os dados para cadastrar uma nova obra</p>
      </div>
      
      <div className="p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Obra*
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="cliente"
                value={formData.cliente}
                onChange={handleInputChange}
                className="block flex-1 rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              <button
                type="button"
                onClick={() => setModalNovoClienteAberto(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center gap-2 transition-colors"
                title="Cadastrar novo cliente/investidor"
              >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Novo</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <input
              type="text"
              name="endereco"
              value={formData.endereco}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável Técnico
            </label>
            <input
              type="text"
              name="responsavel_tecnico"
              value={formData.responsavel_tecnico}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CREA
            </label>
            <input
              type="text"
              name="crea"
              value={formData.crea}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Início
            </label>
            <input
              type="date"
              name="data_inicio"
              value={formData.data_inicio}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Prevista de Término
            </label>
            <input
              type="date"
              name="data_prevista_fim"
              value={formData.data_prevista_fim}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Área Construída (m²)
            </label>
            <input
              type="number"
              name="area_construida"
              value={formData.area_construida || ''}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            >
              <option value="Em andamento">Em andamento</option>
              <option value="Concluída">Concluída</option>
              <option value="Paralisada">Paralisada</option>
              <option value="Planejamento">Planejamento</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows={3}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            ></textarea>
          </div>
          
          <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={onCancelar}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              disabled={carregando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 flex items-center gap-2"
            >
              {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Novo Cliente */}
      {modalNovoClienteAberto && (
        <ModalNovoCliente
          onClose={() => setModalNovoClienteAberto(false)}
          onSuccess={(cliente) => {
            if (cliente?.nome) {
              setFormData(prev => ({
                ...prev,
                cliente: cliente.nome
              }));
            }
          }}
        />
      )}
    </div>
  );
} 