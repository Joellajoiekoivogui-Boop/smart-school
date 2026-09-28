'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Splash } from '@/components/fx';

export default function Home() {
  const { ready, user } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(user ? `/${user.role}` : '/login');
  }, [ready, user, router]);
  return <Splash />;
}
