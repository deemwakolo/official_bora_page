/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  typescript: {
    // Ensuring strict type checking for production reliability
    ignoreBuildErrors: false,

    // Type-check the production application only. The isolated BORA
    // Engine (engine/) is deliberately kept out of the production
    // compilation graph: its test helpers import `vitest`, which is
    // owned by the engine's frozen external toolchain, not by this
    // repository (see tsconfig.build.json).
    tsconfigPath: './tsconfig.build.json',
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