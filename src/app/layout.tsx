import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Poker Training — Master your Game',
  description: 'Entrenamiento de Poker con Torneos, IA y Análisis de Rangos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#0d0d0d] text-white`}>
        {children}
      </body>
    </html>
  );
}
