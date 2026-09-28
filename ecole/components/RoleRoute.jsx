'use client';
import { Suspense } from 'react';
import Shell from './Shell';

export default function RoleRoute({ role, section }) {
  return (
    <Suspense fallback={null}>
      <Shell role={role} segments={section ? [section] : []} />
    </Suspense>
  );
}
