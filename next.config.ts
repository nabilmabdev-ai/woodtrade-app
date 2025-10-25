// next.config.ts

import type { NextConfig } from "next";
import withPWA from 'next-pwa';

// Define the PWA configuration
const pwaConfig = withPWA({
  dest: 'public',
  register: false,      // Your setting for manual registration
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Recommended to disable PWA in dev mode
});

// Your main Next.js configuration
const nextConfig: NextConfig = {
  // ... your other Next.js config options can go here
};

// Wrap the main config with the PWA config
export default pwaConfig(nextConfig);