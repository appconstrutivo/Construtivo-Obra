import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgoafwgxenhwhkxdkwox.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb2Fmd2d4ZW5od2hreGRrd294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDYxMDcsImV4cCI6MjA4NDI4MjEwN30.Fdlx_f8_fP1KmaBvAATb4PyNSEC8Rtd7c6wGURZIMow';

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
      
      // Cookie com configurações compatíveis com o middleware
      document.cookie = `${key}=${encodedValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure=${window.location.protocol === 'https:'}`;
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
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
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