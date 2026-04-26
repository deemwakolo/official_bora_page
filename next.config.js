/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
      // !! WARN !!
      // This allows production builds to successfully complete even if
      // your project has type errors.
      ignoreBuildErrors: true,
    },
    eslint: {
      // This allows production builds to successfully complete even if
      // your project has ESLint errors.
      ignoreSuccessiveBuilds: true,
      ignoreDuringBuilds: true,
    },
  }
  
  module.exports = nextConfig