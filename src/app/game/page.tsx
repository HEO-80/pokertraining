'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GameRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return (
    <div className="h-screen bg-[#060e08] flex items-center justify-center">
      <div className="text-[#d4af37] font-black text-lg animate-pulse">♠ Cargando...</div>
    </div>
  );
}
