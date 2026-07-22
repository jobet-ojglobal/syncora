import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'jgsuperstore.com',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'inflowcloudstaginguser.blob.core.windows.net',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  }
};

export default nextConfig;
