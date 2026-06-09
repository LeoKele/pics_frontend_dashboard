/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://34.63.158.31:8000/api/:path*',
      },
      {
        source: '/minio/:path*',
        destination: 'http://35.194.31.183:9000/:path*',
      }
    ];
  },
};

export default nextConfig;