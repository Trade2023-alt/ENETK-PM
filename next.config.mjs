/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'better-sqlite3',
    '@azure/msal-node',
    '@azure/msal-common',
    '@microsoft/microsoft-graph-client'
  ],
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
