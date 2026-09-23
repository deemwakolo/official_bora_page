import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// BORA OAUTH CALLBACK: GitHub (PKCE) inakutana hapa.
// Code → exchangeCodeForSession → cookie session → Control Room.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL(
          '/admin/login?error=oauth',
          requestUrl.origin
        )
      );
    }
  }

  return NextResponse.redirect(
    new URL(
      '/admin/control-room',
      requestUrl.origin
    )
  );
}