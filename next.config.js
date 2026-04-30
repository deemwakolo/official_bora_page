/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  typescript: {
    // Ensuring strict type checking for production reliability
    ignoreBuildErrors: false,
  },

  eslint: {
    // Maintaining code quality standards during the build process
    ignoreDuringBuilds: false,
  },

  /* 
     NOTE: experimental.serverActions has been removed. 
     It is enabled by default in Next.js 14 and no longer required.
  */
};

module.exports = nextConfig;