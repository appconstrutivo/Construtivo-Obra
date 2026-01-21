/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    domains: [],
    unoptimized: process.env.NODE_ENV !== 'production',
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  trailingSlash: false,
  webpack: (config, { isServer, dev }) => {
    // Em Windows + OneDrive/antivírus é comum ocorrer EPERM/ENOENT ao renomear arquivos do cache do webpack,
    // o que corrompe a pasta `.next` e causa 404 em `/_next/static/*` após F5.
    // Para estabilidade no DEV, forçar cache em memória.
    if (dev) {
      config.cache = { type: 'memory' };
    }

    // Configuração específica para react-pdf
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    // Ignorar avisos do react-pdf
    config.ignoreWarnings = [
      { module: /node_modules\/@react-pdf\/renderer/ },
    ];
    
    return config;
  },
}

module.exports = nextConfig 