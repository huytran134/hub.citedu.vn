/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  experimental: {
    // Giới hạn 1 worker cho static generation — tránh EAGAIN trên VPS shared
    cpus: 1,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    return config
  },
}

module.exports = nextConfig
