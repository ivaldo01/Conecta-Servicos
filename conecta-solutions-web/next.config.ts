import path from 'path';
import type { NextConfig } from "next";

// ============================================================
// CONFIGURAÇÃO DO NEXT.JS — Conecta Solutions Web
// ============================================================
const nextConfig: NextConfig = {

  // Corrige o aviso de múltiplos lockfiles (projeto dentro de outro)
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Permite imagens do Firebase Storage e outras fontes externas
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
