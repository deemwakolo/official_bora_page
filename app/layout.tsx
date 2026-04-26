import './globals.css';
import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';

// Next.js optimized font loading
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
  description: 'Creative Strategy & Sound Design. Dar es Salaam, Tanzania. Turning vision into assets.',
  icons: {
    icon: '/favicon.ico', // Ensure you have this in your /public folder
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
          selection:bg-[#b91c1c] 
          selection:text-white
        `}
      >
        {children}
      </body>
    </html>
  );
}