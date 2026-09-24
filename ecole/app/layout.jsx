import './globals.css';
import { StoreProvider } from '@/lib/store';
import { MotionProvider } from '@/components/motion';
import PWA from '@/components/PWA';

export const metadata = {
  title: 'N°1 — L’école connectée',
  description:
    'Plateforme de gestion scolaire qui connecte élèves, parents, enseignants et administration dans un environnement unique.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'N°1', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PWA />
        <MotionProvider>
          <StoreProvider>{children}</StoreProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
