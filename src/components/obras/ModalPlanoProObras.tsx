import { Building2 } from 'lucide-react';

type ModalPlanoProObrasProps = {
  onFechar: () => void;
  onContratar: () => void;
};

export default function ModalPlanoProObras({ onFechar, onContratar }: ModalPlanoProObrasProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-md">
        <div className="bg-blue-600 p-4 text-white">
          <h3 className="text-xl font-semibold">Múltiplas Obras</h3>
          <p className="text-blue-100 text-sm">Amplie seu gerenciamento</p>
        </div>
        
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <h3 className="text-xl font-semibold mb-2 text-gray-800">
            Esta funcionalidade está disponível apenas para assinantes a partir do plano Pro.
          </h3>
          
          <p className="text-gray-600 mb-6">
            Atualize seu plano para cadastrar múltiplas obras e aproveitar todos os recursos disponíveis.
          </p>
          
          <div className="flex justify-center gap-4 pt-4 border-t">
            <button
              onClick={onFechar}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Fechar
            </button>
            <button
              onClick={onContratar}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700"
            >
              Contratar Plano Superior
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 