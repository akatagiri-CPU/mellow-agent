import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Resume PDFs/images are sent to Server Actions as multipart form data.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
