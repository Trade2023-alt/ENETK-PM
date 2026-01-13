/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Options here
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/data/**',
          '**/contractor.db*',
          '**/.next/**',
          '**/node_modules/**'
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
