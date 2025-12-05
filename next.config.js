/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
    ],
  },
  // App Router uses [lng] segments for i18n, not config
  
  // Webpack configuration for crypto and blockchain modules
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /sidan_csl_rs_bg\.wasm$/,
      type: 'asset/resource',
    });

    // Fix for webpack 5 and crypto modules
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    } else {
      config.externals = config.externals || [];
      config.externals.push('@sidan-lab/sidan-csl-rs-nodejs');
      config.externals.push('@sidan-lab/sidan-csl-rs-browser');
      config.externals.push('@sidan-lab/whisky-js-nodejs');
    }

    return config;
  },
};

module.exports = nextConfig;
