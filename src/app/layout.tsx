import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Poker Training - Master your Game",
  description: "Advanced Poker Training with AI Bots and Tournaments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <header className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-poker-gold/20 py-4 px-6">
          <nav className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-poker-gold to-yellow-200 bg-clip-text text-transparent">
              POKER TRAINING
            </h1>
            <div className="flex gap-8 items-center text-sm uppercase tracking-widest font-medium">
              <a href="#" className="hover:text-poker-gold transition-colors">Inicio</a>
              <a href="#" className="hover:text-poker-gold transition-colors">Torneos</a>
              <a href="#" className="hover:text-poker-gold transition-colors">Mesas</a>
              <a href="#" className="hover:text-poker-gold transition-colors">Opciones</a>
            </div>
          </nav>
        </header>
        <main className="pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}
