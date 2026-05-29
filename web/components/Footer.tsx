import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-lions-mid border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-full bg-lions-blue flex items-center justify-center font-montserrat font-black text-white text-xs">
                JOAT
              </div>
              <span className="font-montserrat font-bold text-white">Jacks of All Trades</span>
            </div>
            <p className="font-opensans text-lions-silver text-sm leading-relaxed max-w-sm">
              A Detroit nonprofit building futures through skilled trade apprenticeships and
              mentoring programs for youth aged 18–35.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-montserrat font-semibold text-white text-sm mb-3">Program</h4>
            <ul className="space-y-2">
              {[
                { label: 'Apply', href: '/apply' },
                { label: 'Programs', href: '/#programs' },
                { label: 'How It Works', href: '/#how-it-works' },
                { label: 'Volunteer', href: '/volunteer' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-opensans text-lions-silver hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-montserrat font-semibold text-white text-sm mb-3">Support</h4>
            <ul className="space-y-2">
              {[
                { label: 'Donate', href: '/donate' },
                { label: 'Shop', href: '/shop' },
                { label: 'Admin', href: '/admin' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-opensans text-lions-silver hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-opensans text-lions-silver text-xs">
            © {new Date().getFullYear()} Jacks of All Trades. All rights reserved. Detroit, MI.
          </p>
          <p className="font-opensans text-lions-silver text-xs">
            501(c)(3) Nonprofit Organization
          </p>
        </div>
      </div>
    </footer>
  );
}
