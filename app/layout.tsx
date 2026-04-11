import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GroupPick 🎬 — Stop arguing, start watching',
  description: 'The group decision resolver. Everyone submits prefs, AI picks the perfect match.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen party-gradient`}>
        <div className="min-h-screen">
          <header className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-neutral-900/60 backdrop-blur-sm sticky top-0 z-50 bg-black/50">
            <a href="/" className="flex items-center gap-2 group">
              <span className="text-3xl font-black tracking-tighter text-[#e50914] group-hover:text-[#f40612] transition-colors">
                GROUPPICK
              </span>
            </a>
            <span className="hidden sm:block text-[10px] text-neutral-500 font-bold tracking-[0.2em] uppercase">
              Group Decision Resolver
            </span>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
