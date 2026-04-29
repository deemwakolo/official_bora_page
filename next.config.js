/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Some versions require this to be 'true', others need it enabled specifically
    serverActions: true,
  },
  // Force the compiler to re-evaluate the SWC plugins
  swcMinify: true, 
}

module.exports = nextConfig