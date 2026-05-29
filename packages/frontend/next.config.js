const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ["@cvbuilder/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};