'use client';
/** Enregistre le service worker (mode hors connexion) et signale la perte de connexion. */
import { useEffect, useState } from 'react';
import { LITE } from './motion';

export default function PWA() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (LITE) document.documentElement.classList.add('lite');
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="offline-bar" role="status">
      Hors connexion — vos données restent consultables. Les modifications sont enregistrées sur cet appareil.
    </div>
  );
}
