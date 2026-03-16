/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.fal.media',
      },
      {
        protocol: 'https',
        hostname: 'fal.media',
      },
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    // Externalize Remotion bundler and renderer for server-side
    if (isServer) {
      config.externals.push('@remotion/bundler', '@remotion/renderer', '@rspack/core', '@rspack/binding');
    }
    return config;
  },
};

export default nextConfig;
