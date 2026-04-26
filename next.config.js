/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ⚠ allows build even with TS errors (temporary only)
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠ allows build even with lint errors
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;