/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs']
  },
  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;
