/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Giới hạn 1 worker cho static generation — tránh EAGAIN trên VPS shared
    cpus: 1,
  },
}

module.exports = nextConfig
