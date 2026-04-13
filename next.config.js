/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb'
    }
  },
  serverExternalPackages: ['better-sqlite3']
}

module.exports = nextConfig
