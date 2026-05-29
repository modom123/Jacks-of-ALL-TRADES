import type { Metadata } from 'next';
import { Montserrat, Open_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-opensans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Jacks of All Trades | Detroit Apprenticeship Program',
  description:
    'Building futures and rebuilding Detroit through skilled trade apprenticeships and mentoring for youth.',
  keywords: ['Detroit', 'apprenticeship', 'trades', 'mentoring', 'nonprofit', 'youth'],
  openGraph: {
    title: 'Jacks of All Trades',
    description: 'Building Futures, Rebuilding Detroit',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <body className="bg-lions-black text-white antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
