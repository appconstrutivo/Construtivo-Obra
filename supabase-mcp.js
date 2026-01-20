#!/usr/bin/env node

async function startSupabaseMCP() {
  try {
    // Import dinâmico para compatibilidade com ES modules
    const { start } = await import('@supabase/mcp-server-supabase');
    
    // Token de acesso do Supabase
    const accessToken = 'sbp_f41dca9aca27d1edc3034628433b4a8850a21a1d';
    
    // Inicia o servidor MCP
    await start({
      accessToken: accessToken
    });
  } catch (error) {
    console.error('Erro ao iniciar o servidor MCP do Supabase:', error);
    process.exit(1);
  }
}

// Executa a função
startSupabaseMCP(); 