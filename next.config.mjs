/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@azure/msal-node',
    '@azure/msal-common',
    '@microsoft/microsoft-graph-client'
  ],
  transpilePackages: ['recharts'],
  turbopack: {
    // Options here
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/data/**',
          '**/.next/**',
          '**/node_modules/**'
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
