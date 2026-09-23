// app/layout.tsx

import type { Metadata } from 'next';

import localFont from 'next/font/local';

import './globals.css';
import MasterGUI from './components/components-themes/MasterGUI';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${cinzel.variable} antialiased font-sans`}
        style={{
          backgroundColor: 'var(--bora-background)',
          color: 'var(--bora-text)',
        }}
      >
        <MasterGUI>
          {children}
        </MasterGUI>
      </body>
    </html>
  );
}