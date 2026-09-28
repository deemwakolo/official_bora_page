// app/layout.tsx

import type { Metadata } from 'next';

import localFont from 'next/font/local';

import './globals.css';
import MasterGUI from './components/components-themes/MasterGUI';
import BoraUIBridge from './components/ui-room/BoraUIBridge';
import {
  boraDefaultTokens,
  boraTokensToCssText,
} from './components/components-themes/tokens/applyBoraTokens';

import { resolveBoraUIConfigCss } from '../lib/ui-config';

// BORA TOKENS: server-rendered from the token spec (single source
// of truth). This replaces the duplicated `:root` block in
// globals.css and removes the first-paint flash, because the values
// are present before any JavaScript runs.
//
// Values are VERBATIM the previous BORA Default palette.
const boraInitialTokens = boraTokensToCssText(boraDefaultTokens());

/**
 * COMMITTED UI CONFIG (Phase 2F, model (c))
 *
 * Server-resolved before render: file baseline + Supabase override,
 * with the file as fallback on ANY failure. Empty config resolves
 * to an empty string, so nothing is injected and the public site
 * behaves exactly as before.
 */
async function resolveCommittedUIConfig(): Promise<string> {
  try {
    return await resolveBoraUIConfigCss();
  } catch (error) {
    console.error(
      '[ui-config] boot resolution failed, serving defaults:',
      error instanceof Error ? error.message : error
    );

    return '';
  }
}

// LOCAL FONTS: variable TTFs, self-hosted. Hakuna Google/CDN.
// Inter: variable opsz,wght — full weight range inapatikana.
const inter = localFont({
  src: './fonts/Inter/Inter-VariableFont_opsz,wght.ttf',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
});

// Cinzel: variable wght 400-900 — inaunga mkono 400, 700, 900.
const cinzel = localFont({
  src: './fonts/Cinzel/Cinzel-VariableFont_wght.ttf',
  variable: '--font-cinzel',
  weight: '400 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BORA CHARTS // MATITU NATION ARCHIVE',
  description:
    'Creative Strategy & Sound Design. Dar es Salaam, Tanzania. Turning vision into assets.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const boraCommittedConfigCss = await resolveCommittedUIConfig();

  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${cinzel.variable} antialiased font-sans`}
        style={{
          backgroundColor: 'var(--bora-background)',
          color: 'var(--bora-text)',
        }}
      >
        {/* BORA DESIGN TOKENS — from boraTokenSpec */}
        <style
          id="bora-tokens"
          dangerouslySetInnerHTML={{ __html: boraInitialTokens }}
        />

        {/* COMMITTED UI CONFIG — file baseline + DB override.
            Empty when nothing is committed: fully inert. */}
        {boraCommittedConfigCss.length > 0 && (
          <style
            id="bora-ui-config"
            dangerouslySetInnerHTML={{
              __html: boraCommittedConfigCss,
            }}
          />
        )}

        <MasterGUI>
          {children}

          {/* UI ROOM BRIDGE — renders null and stays inert until the
              UI Room activates it. Public app is unaffected. */}
          <BoraUIBridge />
        </MasterGUI>
      </body>
    </html>
  );
}