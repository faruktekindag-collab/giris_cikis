/** @type {import('next').NextConfig} */
const nextConfig = {
  // API routes are now handled by Next.js API routes (no external backend needed)
  // If you want to switch back to external Python backend, uncomment below:
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/:path*",
  //       destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
  //     },
  //   ];
  // },
};

module.exports = nextConfig;
