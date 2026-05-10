import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Ensure server-side packages are properly bundled
  serverExternalPackages: ["formidable", "exceljs", "pdfkit"],
};

export default nextConfig;
