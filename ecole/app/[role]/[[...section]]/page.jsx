import { notFound } from 'next/navigation';
import RoleRoute from '@/components/RoleRoute';
import { NAVIGATION } from '@/lib/navigation';

// Toutes les pages sont connues à l'avance (4 espaces × leurs rubriques) :
// elles sont générées en HTML statique au build, sans aucune fonction serveur.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.entries(NAVIGATION).flatMap(([role, items]) =>
    items.map((item) => ({ role, section: item.key ? [item.key] : [] })),
  );
}

export default async function RolePage({ params }) {
  const { role, section } = await params;
  const key = section?.[0] || '';
  if (!NAVIGATION[role]?.some((i) => i.key === key)) notFound();
  return <RoleRoute role={role} section={key} />;
}
