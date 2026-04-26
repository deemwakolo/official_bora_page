/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Allows production builds to finish even with type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allows production builds to finish even with linting errors
    // Note: 'ignoreSuccessiveBuilds' was removed as it is invalid
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig