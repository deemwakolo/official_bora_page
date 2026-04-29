// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';

// Added adjustFontFallback: false to prevent build timeouts
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  adjustFontFallback: false, 
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'BORA CHARTS // MATITU NATION ARCHIVE',
  description: 'Creative Strategy & Sound Design. Dar es Salaam, Tanzania. Turning vision into assets.',
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
          bg-[#050505] 
          text-white 
          antialiased 
          font-sans
          selection:bg-[#b91c1c] 
          selection:text-white
        `}
      >
        {/* The font-sans class ensures a fallback if Inter fails to load */}
        {children}
      </body>
    </html>
  );
}