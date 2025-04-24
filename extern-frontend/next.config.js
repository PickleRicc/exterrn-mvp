/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure trailingSlash is false for dynamic routes to work properly
  trailingSlash: false,
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  }
};

module.exports = nextConfig;
