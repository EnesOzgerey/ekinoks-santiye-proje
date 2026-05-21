import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Diğer mevcut yapılandırma ayarların varsa burada kalabilir */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Katalog yüklemeleri için sınırı 10 MB yaptık (ihtiyaca göre '50mb' da yapabilirsin)
    },
  },
};

export default nextConfig;