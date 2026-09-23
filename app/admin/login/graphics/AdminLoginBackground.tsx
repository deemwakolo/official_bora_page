'use client';

import AdminLoginGlow from './AdminLoginGlow';
import AdminLoginParticles from './AdminLoginParticles';

export default function AdminLoginBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
    >
      <AdminLoginGlow />
      <AdminLoginParticles />
    </div>
  );
}
