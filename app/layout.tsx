// app/layout.tsx

import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';

import './globals.css';
import MasterGUI from './components/components-themes/MasterGUI';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel',
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
        className={`
          ${inter.variable}
          ${cinzel.variable}
          antialiased
          font-sans
        `}
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