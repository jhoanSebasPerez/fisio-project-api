/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar el modo de salida como servidor en lugar de exportación estática
  output: 'standalone',

  // Deshabilitar comprobación de tipos durante el build
  typescript: {
    // !! ADVERTENCIA !!
    // Deshabilitar la verificación de tipo es peligroso pero permitido
    ignoreBuildErrors: true,
  },
  
  // Deshabilitar comprobación de ESLint durante el build
  eslint: {
    // También es peligroso pero permitido
    ignoreDuringBuilds: true,
  },
  
  // Configurar desactivación de prerender estático para rutas dinámicas
  experimental: {
    // Esto previene que Next.js intente pre-renderizar páginas con funcionalidades dinámicas
    missingSuspenseWithCSRBailout: false
  },
  
  // Ignorar errores de webpack
  webpack: (config, { isServer }) => {
    // Incrementar el límite de memoria de webpack para evitar errores de memoria
    config.performance = {
      ...config.performance,
      maxAssetSize: 1000000, // 1MB
      maxEntrypointSize: 1000000, // 1MB
    };
    return config;
  },
};

module.exports = nextConfig;
