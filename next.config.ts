import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress the webpack warnings for RealtimeClient
    config.ignoreWarnings = [
      {
        module: /node_modules\/@supabase\/realtime-js/,
        message: /Critical dependency/,
      },
      {
        module: /node_modules\/@supabase\/realtime-js/,
        message: /Serializing big strings/,
      },
    ];
    
    return config;
  },
};

export default nextConfig;
