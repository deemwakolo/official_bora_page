import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            }
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const { data: session } = await supabase.auth.getClaims();

  // ─── BORA ROUTE PROTECTION (v1: AUTHENTICATED = ALLOWED) ───
  // Doorway (room-selector) na rooms zote zinalindwa — mtu hawezi
  // kuandika URL ya room moja kwa moja na kuruka mlango.
  const PROTECTED_PREFIXES = [
    '/admin/room-selector',
    '/admin/control-room',
    '/admin/operations',
    '/admin/ui',
    '/admin/engine',
    '/admin/updates',
    '/admin/security',
    '/admin/settings',
  ];

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (isProtected && !session?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
