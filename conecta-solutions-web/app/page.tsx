'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

// ============================================================
// PÁGINA RAIZ "/"
// Redireciona para /dashboard se autenticado, senão /login
// ============================================================
export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.push(user ? '/dashboard' : '/login');
    }
  }, [user, loading, router]);

  return null;
}
