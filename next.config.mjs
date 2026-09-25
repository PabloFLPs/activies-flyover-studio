/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // MapLibre GL, the canvas HUD, MediaRecorder and the WebCodecs MP4 encoder are
  // all browser-only. The whole Studio is loaded client-side (dynamic import,
  // ssr:false), so nothing here needs to run on the server.
  eslint: {
    // Keep `npm run lint` available, but don't let lint gate a production build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
