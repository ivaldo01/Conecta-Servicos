import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";

// =============================================
// FONTE
// Inter — fonte corporativa usada em todo o sistema
// =============================================
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// =============================================
// SEO — Meta tags da aplicação
// =============================================
export const metadata: Metadata = {
  title: "Conecta Solutions — Painel de Gestão",
  description: "Plataforma de agendamento e gestão profissional — Conecta Solutions",
  icons: { icon: "/logo-cs.png" },
};

// =============================================
// ROOT LAYOUT
// Envolve toda a aplicação com o AuthProvider
// =============================================
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} data-scroll-behavior="smooth">
      <body className="font-inter antialiased bg-gray-50 text-gray-900">
        {/* Provider de autenticação global */}
        <AuthProvider>
          {children}

          {/* Sistema de notificações (toasts) */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'var(--font-inter)',
                borderRadius: '10px',
                fontSize: '14px',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
