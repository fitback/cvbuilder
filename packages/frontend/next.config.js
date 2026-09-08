const BACKEND_URL = "http://localhost:3001";

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob:`,
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' http://localhost:3001`,
].join("; ");

/** @type {import('next').NextConfig} */
module.exports = {
  output: "standalone",
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  transpilePackages: ["@cvbuilder/shared"],
  experimental: {
    optimizePackageImports: ["@uiw/react-md-editor", "react-markdown", "lucide-react"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};