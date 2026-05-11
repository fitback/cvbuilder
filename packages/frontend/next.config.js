/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ["@cvbuilder/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};