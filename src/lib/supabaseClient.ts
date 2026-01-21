import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars não configuradas. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// Storage personalizado que salva em localStorage E cookies
const dualStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Tentar localStorage primeiro
      const localValue = localStorage.getItem(key);
      if (localValue) {
        console.log(`[Client] Sessão obtida do localStorage: ${key}`);
        return localValue;
      }
      
      // Fallback para cookies
      const cookies = document.cookie.split(';');
      const cookie = cookies.find(c => c.trim().startsWith(`${key}=`));
      if (cookie) {
        const value = cookie.split('=').slice(1).join('=');
        console.log(`[Client] Sessão obtida dos cookies: ${key}`);
        return decodeURIComponent(value);
      }
      
      return null;
    } catch (error) {
      console.warn('Erro ao ler storage:', error);
      return null;
    }
  },
  
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Salvar no localStorage
      localStorage.setItem(key, value);
      console.log(`[Client] Sessão salva no localStorage: ${key}`);
      
      // TAMBÉM salvar em cookies para o middleware acessar
      const expires = new Date();
      expires.setDate(expires.getDate() + 1); // 1 dia
      const encodedValue = encodeURIComponent(value);
      const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
      
      // Cookie com configurações compatíveis com o middleware
      document.cookie = `${key}=${encodedValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureAttr}`;
      console.log(`[Client] Sessão TAMBÉM salva em cookies: ${key}`);
      
    } catch (error) {
      console.warn('Erro ao salvar storage:', error);
      // Fallback apenas para localStorage
      localStorage.setItem(key, value);
    }
  },
  
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Remover do localStorage
      localStorage.removeItem(key);
      console.log(`[Client] Sessão removida do localStorage: ${key}`);
      
      // Remover dos cookies
      const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${secureAttr}`;
      console.log(`[Client] Sessão removida dos cookies: ${key}`);
      
    } catch (error) {
      console.warn('Erro ao remover storage:', error);
      localStorage.removeItem(key);
    }
  }
};

// Configurar o cliente com storage dual
export const supabase: SupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Usar storage dual (localStorage + cookies)
    storage: dualStorage,
    debug: false
  },
  global: {
    headers: {
      'x-client-info': 'construtivo-web'
    }
  }
});

// Interface para tornar o arquivo compatível com o uso anterior de createClient
export const createClient = (): SupabaseClient => supabase; 