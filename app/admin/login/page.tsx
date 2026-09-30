'use client';

import { Suspense } from 'react';

import { NuqsAdapter } from 'nuqs/adapters/next/app';

import AdminLoginOP from './AdminLoginOP';

// SUSPENSE INAHITAJIKA: AdminLoginOP inatumia useQueryState()
// (injasoma ?error=oauth kutoka kwa OAuth callback). Hii ni
// requirement ya Next.js App Router kwa hooks zinazotumia
// useSearchParams — haijibadilishwa na nuqs.
//
// NuqsAdapter hapa, si kwenye root layout: BORA URL state ni
// capability ya ukurasa huu pekee. Kuweka provider kwenye
// layout.tsx ingewafanya umma na public app kuwa na URL-state
// behaviour ambayo haipo kwenye BORA.
export default function Page() {
  return (
    <NuqsAdapter>
      <Suspense fallback={null}>
        <AdminLoginOP />
      </Suspense>
    </NuqsAdapter>
  );
}
