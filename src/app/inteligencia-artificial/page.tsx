"use client";

import React, { useState } from 'react';
import { Brain, Calendar, ClipboardList, LineChart, Package } from 'lucide-react';
import { motion } from 'framer-motion';

interface AICardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  onClick: () => void;
}

export default function InteligenciaArtificialPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');

  const handleCardClick = (title: string) => {
    setModalTitle(title);
    setModalOpen(true);
  };

  const AICard: React.FC<AICardProps> = ({ title, icon, description, onClick }) => {
    return (
      <motion.div
        className="flex flex-col items-center justify-center p-8 rounded-xl bg-white shadow-md border border-gray-200 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300"
        whileHover={{ scale: 1.03 }}
        onClick={onClick}
      >
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 text-center">{description}</p>
      </motion.div>
    );
  };

  const aiOptions = [
    {
      title: "Orçamento",
      icon: <LineChart className="w-8 h-8 text-primary" />,
      description: ""
    },
    {
      title: "Cronograma",
      icon: <Calendar className="w-8 h-8 text-primary" />,
      description: ""
    },
    {
      title: "Acompanhamento de Obra",
      icon: <ClipboardList className="w-8 h-8 text-primary" />,
      description: ""
    },
    {
      title: "Controle Insumos",
      icon: <Package className="w-8 h-8 text-primary" />,
      description: ""
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com título */}
      <div className="w-full py-6 px-6 md:px-12 flex items-center gap-4 mb-6">
        <div className="p-3 rounded-lg bg-black">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Inteligência Artificial
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {aiOptions.map((option, index) => (
            <AICard
              key={index}
              title={option.title}
              icon={option.icon}
              description={option.description}
              onClick={() => handleCardClick(option.title)}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-gray-200 rounded-lg p-8 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full bg-primary/10">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{modalTitle}</h2>
            </div>
            
            <div className="mb-8">
              <p className="text-gray-700 mb-4">
                Esta funcionalidade está disponível apenas para assinantes do plano completo.
              </p>
            </div>
            
            <div className="flex justify-between">
              <button 
                onClick={() => setModalOpen(false)}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Fechar
              </button>
              <button 
                className="px-6 py-2 bg-primary rounded-md text-white font-medium hover:bg-primary/90 transition-colors"
              >
                Contratar Plano Completo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 