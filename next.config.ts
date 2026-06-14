import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Mark the core module and its troublesome dependencies as external
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
};

export default nextConfig;