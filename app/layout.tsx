import './globals.css';
import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';

// Load fonts properly (Next.js optimized)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel',
});

export const metadata: Metadata = {
  title: 'Bora Music Charts',
  description: 'Real-time music dominance. We Here.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cinzel.variable}`}>
        {children}
      </body>
    </html>
  );
}