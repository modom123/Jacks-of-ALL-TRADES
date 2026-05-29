'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';

const navLinks = [
  { label: 'Programs', href: '/#programs' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Impact', href: '/#impact' },
  { label: 'Shop', href: '/shop' },
  { label: 'Donate', href: '/donate' },
  { label: 'Volunteer', href: '/volunteer' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-lions-black/95 backdrop-blur-sm shadow-lg shadow-black/30'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-lions-blue flex items-center justify-center font-montserrat font-black text-white text-sm group-hover:bg-lions-blue-light transition-colors">
              JOAT
            </div>
            <span className="font-montserrat font-bold text-white text-sm hidden sm:block leading-tight">
              Jacks of All Trades
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-lions-silver hover:text-white transition-colors font-opensans"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/apply"
              className="px-4 py-2 bg-lions-blue hover:bg-lions-blue-light text-white text-sm font-semibold rounded-lg transition-colors font-montserrat"
            >
              Apply Now
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-lions-dark border-t border-white/10 px-4 pb-4 pt-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-lions-silver hover:text-white text-sm font-opensans border-b border-white/5"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/apply"
            onClick={() => setOpen(false)}
            className="mt-4 block w-full text-center px-4 py-3 bg-lions-blue hover:bg-lions-blue-light text-white font-semibold rounded-lg transition-colors font-montserrat text-sm"
          >
            Apply Now
          </Link>
        </div>
      )}
    </nav>
  );
}
