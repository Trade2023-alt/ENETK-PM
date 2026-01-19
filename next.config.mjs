/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@azure/msal-node',
    '@azure/msal-common',
    '@microsoft/microsoft-graph-client'
  ],
  transpilePackages: ['recharts', 'd3-array', 'd3-color', 'd3-format', 'd3-interpolate', 'd3-path', 'd3-scale', 'd3-shape', 'd3-time', 'd3-timer'],
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
