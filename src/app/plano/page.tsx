"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  Zap,
  Rocket,
  Star,
  Crown,
  Brain,
  BarChart4,
  Package,
  ClipboardList,
  FileText,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Interfaces para tipagem
interface Feature {
  text: string;
  included: boolean;
  highlighted?: boolean;
  new?: boolean;
}

interface PlanCardProps {
  title: string;
  price: string;
  description: string;
  features: Feature[];
  isPopular?: boolean;
  cta?: string;
  variant?: 'default' | 'pro' | 'gold';
}

// Componente de card de plano
const PlanCard = ({ 
  title, 
  price, 
  description, 
  features, 
  isPopular = false, 
  cta = "Escolher plano",
  variant = "default"
}: PlanCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Define as cores com base na variante
  const getVariantStyles = () => {
    switch (variant) {
      case "gold":
        return {
          background: "bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400",
          border: "border-yellow-400",
          button: "bg-amber-800 hover:bg-amber-900 text-white shadow-amber-500/20",
          shadow: "shadow-amber-500/10",
          highlight: "bg-amber-100"
        };
      case "pro":
        return {
          background: "bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400",
          border: "border-blue-400",
          button: "bg-blue-700 hover:bg-blue-800 text-white shadow-blue-700/20",
          shadow: "shadow-blue-500/10",
          highlight: "bg-blue-100"
        };
      default:
        return {
          background: "bg-gradient-to-br from-slate-50 to-slate-100",
          border: "border-slate-200",
          button: "bg-slate-700 hover:bg-slate-800 text-white shadow-slate-500/20",
          shadow: "shadow-slate-200/10",
          highlight: "bg-slate-100"
        };
    }
  };

  const styles = getVariantStyles();

  // Efeito de confete para o plano popular quando hover
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (isPopular) {
      const end = Date.now() + 200;
      const colors = ['#FFD700', '#FFC107', '#FFD700'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0.5, y: 0.5 },
          colors: colors,
          disableForReducedMotion: true
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.2 },
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex flex-col h-full rounded-2xl border-2 p-6 ${styles.background} ${styles.border} ${styles.shadow} shadow-xl transition-all duration-300 ${isHovered ? 'scale-[1.02]' : ''}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-max rounded-full bg-gradient-to-r from-amber-600 to-amber-400 px-3 py-1 text-xs font-medium text-white shadow-lg">
          Mais popular
        </div>
      )}
      
      <div className="mb-4 text-center">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>
      
      <div className="mb-6 text-center">
        <span className="text-4xl font-bold">R$ {price}</span>
        <span className="text-slate-600 text-sm">/mês</span>
      </div>
      
      <ul className="mb-8 space-y-2.5 flex-1">
        {features.map((feature: Feature, index: number) => (
          <li key={index} className="flex items-start gap-2">
            <div className={`mt-0.5 rounded-full p-1 ${feature.included ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
              {feature.included ? <Check size={16} /> : <X size={16} />}
            </div>
            <span className={`text-sm ${feature.highlighted ? 'font-semibold' : 'text-slate-600'}`}>
              {feature.text}
            </span>
            {feature.new && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Novo
              </span>
            )}
          </li>
        ))}
      </ul>
      
      <button 
        className={`w-full rounded-lg py-3 font-medium transition-colors ${styles.button}`}
      >
        {cta}
      </button>
    </motion.div>
  );
};

// Componente principal da página de planos
export default function PlanosPage() {
  const startFeatures: Feature[] = [
    { text: "Cadastro de itens", included: true },
    { text: "Relatórios em PDF", included: true },
    { text: "Interface moderna", included: true },
    { text: "Controle de medições", included: true },
    { text: "Controle de multiplas obras", included: false },
    { text: "Dashboard básico", included: true },
    { text: "Previsão de desembolso", included: false },
    { text: "Orçamento com SINAPI", included: false },
    { text: "Base SINAPI com seleção por estado", included: false },
    { text: "Ocultar valor orçado/venda", included: false, new: false },
    { text: "IA para orçamento", included: false },
    { text: "Controle de estoque", included: false },
    { text: "IA para cronograma de obra", included: false },
  ];

  const proFeatures: Feature[] = [
    { text: "Cadastro de itens", included: true },
    { text: "Relatórios em PDF", included: true },
    { text: "Interface moderna", included: true },
    { text: "Controle de medições", included: true },
    { text: "Controle de multiplas obras", included: true, highlighted: true, new: true },
    { text: "Dashboard avançado", included: true, highlighted: true, new: true },
    { text: "Previsão de desembolso", included: true, highlighted: true, new: true },
    { text: "Orçamento com SINAPI", included: true, highlighted: true, new: true },
    { text: "Base SINAPI com seleção por estado", included: true, highlighted: true, new: true },
    { text: "Ocultar valor orçado/venda", included: true, highlighted: true, new: true },
    { text: "IA para orçamento", included: false },
    { text: "Controle de estoque", included: false },
    { text: "IA para cronograma de obra", included: false },
  ];

  const completoFeatures: Feature[] = [
    { text: "Cadastro de itens", included: true },
    { text: "Relatórios em PDF", included: true },
    { text: "Interface moderna", included: true },
    { text: "Controle de medições", included: true },
    { text: "Controle de multiplas obras", included: true },
    { text: "Dashboard avançado", included: true },
    { text: "Previsão de desembolso", included: true },
    { text: "Orçamento com SINAPI", included: true },
    { text: "Base SINAPI com seleção por estado", included: true },
    { text: "Ocultar valor orçado/venda", included: true },
    { text: "IA para orçamento", included: true, highlighted: true, new: true },
    { text: "Controle de estoque", included: true, highlighted: true, new: true },
    { text: "IA para cronograma de obra", included: true, highlighted: true, new: true },
  ];

  return (
    <div className="flex flex-col min-h-screen py-12 px-6 md:px-12">
      <div className="text-center max-w-4xl mx-auto mb-16">
        <div className="inline-block rounded-lg bg-gradient-to-r from-amber-100 to-amber-200 p-2 mb-4">
          <Crown className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Evolua seu Controle de Obras
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Escolha o plano ideal para suas necessidades. Atualize hoje e desfrute de mais recursos para gerenciar seus projetos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
        <PlanCard
          title="Start"
          price="56,90"
          description="Essencial para pequenas obras"
          features={startFeatures}
          variant="default"
          cta="Começar agora"
        />
        
        <PlanCard
          title="Pro"
          price="89,90"
          description="Ideal para construtoras"
          features={proFeatures}
          isPopular={true}
          variant="pro"
          cta="Escolher Pro"
        />
        
        <PlanCard
          title="Completo"
          price="117,90"
          description="Solução completa para grandes projetos"
          features={completoFeatures}
          variant="gold"
          cta="Obter plano completo"
        />
      </div>

      <div className="mt-24 max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-center mb-8">Por que atualizar seu plano?</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-100">
            <div className="rounded-full bg-blue-100 w-12 h-12 flex items-center justify-center mb-4">
              <Rocket className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Produtividade</h3>
            <p className="text-slate-600">Aumente a eficiência da sua equipe com recursos avançados.</p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-100">
            <div className="rounded-full bg-green-100 w-12 h-12 flex items-center justify-center mb-4">
              <BarChart4 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Controle</h3>
            <p className="text-slate-600">Monitore custos e prazos com maior precisão.</p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-100">
            <div className="rounded-full bg-amber-100 w-12 h-12 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Inteligência</h3>
            <p className="text-slate-600">Use IA para otimizar seus orçamentos e planejamentos.</p>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center max-w-2xl mx-auto">
        <p className="text-slate-600 mb-4">
          Precisa de um plano personalizado para sua empresa?
        </p>
        <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all">
          <Sparkles size={18} />
          Fale com nosso time
        </button>
      </div>
    </div>
  );
} 