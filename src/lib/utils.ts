import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Valida se um valor numérico possui até 3 casas decimais
 * @param valor Valor a ser validado
 * @returns true se o valor for válido (até 3 casas decimais), false caso contrário
 */
export function validarAte3CasasDecimais(valor: number | string): boolean {
  if (typeof valor === 'string') {
    valor = parseFloat(valor);
  }
  
  // Se não for um número válido, retorna false
  if (isNaN(valor)) return false;
  
  // Converte para string e verifica se tem ponto decimal
  const valorStr = valor.toString();
  const partesValor = valorStr.split('.');
  
  // Se não tem parte decimal, é válido
  if (partesValor.length === 1) return true;
  
  // Verifica se a parte decimal tem até 3 dígitos
  return partesValor[1].length <= 3;
}

/**
 * Formata um valor monetário com até 3 casas decimais
 * @param valor Valor a ser formatado
 * @param mostrarSimbolo Se deve mostrar o símbolo da moeda (R$)
 * @returns String formatada no padrão brasileiro
 */
export function formatarValorMoeda(valor: number, mostrarSimbolo: boolean = true): string {
  // Formatar o valor para ter exatamente 3 casas decimais
  const valorFormatado = valor.toFixed(3);
  
  // Usar o formatador do Intl para ter os separadores corretos
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: mostrarSimbolo ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  
  return formatter.format(parseFloat(valorFormatado));
}

/**
 * Formata uma data para exibição no padrão brasileiro, corrigindo problemas de timezone
 * @param dataString String da data no formato ISO (YYYY-MM-DD) ou data completa
 * @returns String formatada no padrão brasileiro (DD/MM/AAAA)
 */
export function formatarDataBrasil(dataString: string): string {
  if (!dataString) return '';
  
  // Se a string está no formato YYYY-MM-DD (apenas data), adiciona horário local para evitar problemas de timezone
  if (dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Cria a data diretamente dos componentes para evitar problemas de timezone
    const [ano, mes, dia] = dataString.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia); // mes - 1 porque o JavaScript usa 0-11 para meses
    return data.toLocaleDateString('pt-BR');
  }
  
  // Para outros formatos de data, usa o comportamento padrão
  return new Date(dataString).toLocaleDateString('pt-BR');
}

// Função utilitária para limpeza completa do storage de autenticação
export const clearAuthStorage = () => {
  if (typeof window === 'undefined') {
    console.warn('clearAuthStorage: Função só pode ser executada no cliente');
    return false;
  }
  
  try {
    console.log('Iniciando limpeza completa do storage de autenticação...');
    
    // 1. Limpar localStorage
    const localStorageKeys = Object.keys(localStorage);
    const authKeys = localStorageKeys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('sb-') ||
      key === 'lastRoute'
    );
    
    console.log('Chaves do localStorage a serem removidas:', authKeys);
    authKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // 2. Limpar sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    const sessionAuthKeys = sessionStorageKeys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('sb-')
    );
    
    console.log('Chaves do sessionStorage a serem removidas:', sessionAuthKeys);
    sessionAuthKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    // 3. Limpar cookies relacionados ao auth
    const authCookies = [
      'sb-zgoafwgxenhwhkxdkwox-auth-token',
      'supabase.auth.token',
      'supabase-auth-token'
    ];
    
    authCookies.forEach(cookieName => {
      // Remover com diferentes configurações de domínio
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost;`;
    });
    
    console.log('Storage de autenticação limpo com sucesso!');
    return true;
    
  } catch (error) {
    console.error('Erro ao limpar storage de autenticação:', error);
    return false;
  }
};

// Função para diagnosticar problemas de storage
export const diagnosticStorage = () => {
  if (typeof window === 'undefined') {
    console.warn('diagnosticStorage: Função só pode ser executada no cliente');
    return;
  }
  
  console.log('=== DIAGNÓSTICO DO STORAGE ===');
  
  // LocalStorage
  console.log('LocalStorage:');
  const localKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('auth') || key.includes('sb-')
  );
  if (localKeys.length === 0) {
    console.log('  Nenhuma chave de auth encontrada');
  } else {
    localKeys.forEach(key => {
      console.log(`  ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
    });
  }
  
  // SessionStorage
  console.log('SessionStorage:');
  const sessionKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('supabase') || key.includes('auth') || key.includes('sb-')
  );
  if (sessionKeys.length === 0) {
    console.log('  Nenhuma chave de auth encontrada');
  } else {
    sessionKeys.forEach(key => {
      console.log(`  ${key}: ${sessionStorage.getItem(key)?.substring(0, 50)}...`);
    });
  }
  
  // Cookies
  console.log('Cookies relacionados ao auth:');
  const cookies = document.cookie.split(';');
  const authCookies = cookies.filter(cookie => 
    cookie.includes('supabase') || cookie.includes('auth') || cookie.includes('sb-')
  );
  if (authCookies.length === 0) {
    console.log('  Nenhum cookie de auth encontrado');
  } else {
    authCookies.forEach(cookie => {
      console.log(`  ${cookie.trim()}`);
    });
  }
  
  console.log('=== FIM DO DIAGNÓSTICO ===');
}; 