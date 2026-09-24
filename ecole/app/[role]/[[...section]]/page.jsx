'use client';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { NAVIGATION } from '@/lib/navigation';

export default function RolePage() {
  const { role, section } = useParams();
  if (!NAVIGATION[role]) {
    return (
      <div className="empty" style={{ paddingTop: 120 }}>
        <h1>Page introuvable</h1>
        <a className="btn btn-primary mt" href="/login">
          Retour à la connexion
        </a>
      </div>
    );
  }
  const segments = (Array.isArray(section) ? section : section ? [section] : []).map(decodeURIComponent);
  return <Shell role={role} segments={segments} />;
}
