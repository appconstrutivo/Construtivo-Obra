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
  webpack: (config, { isServer }) => {
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