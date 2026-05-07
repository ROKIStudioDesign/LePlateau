/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "graph.microsoft.com" },
    ],
  },
  webpack: (config) => {
    // Konva's Node bundle optionally requires `canvas`. The canvas component
    // is loaded client-side only (ssr: false), so we stub the module out to
    // prevent build failures.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
