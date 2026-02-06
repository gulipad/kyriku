/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sparkjsdev/spark'],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
