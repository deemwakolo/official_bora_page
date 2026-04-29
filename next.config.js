const nextConfig = {
  reactStrictMode: true,

  typescript: {
    // ❗ REMOVE ignoreBuildErrors in production
    ignoreBuildErrors: false,
  },

  eslint: {
    // ❗ KEEP SAFE (recommended for production discipline)
    ignoreDuringBuilds: false,
  },

  experimental: {
    serverActions: true, // keep if you're using App Router actions
  },
};

module.exports = nextConfig;