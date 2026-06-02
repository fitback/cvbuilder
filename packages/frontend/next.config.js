const BACKEND_URL = "http://localhost:3001";

/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ["@cvbuilder/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};