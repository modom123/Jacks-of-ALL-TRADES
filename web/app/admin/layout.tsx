import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/admin/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  const navItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Applications', href: '/admin/applications' },
    { label: 'Contacts', href: '/admin/contacts' },
    { label: 'Donations', href: '/admin/donations' },
    { label: 'Volunteers', href: '/admin/volunteers' },
  ];

  return (
    <div className="min-h-screen bg-lions-black flex">
      {/* Sidebar */}
      <aside className="w-56 bg-lions-dark border-r border-white/10 flex flex-col fixed h-full">
        <div className="p-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-lions-blue flex items-center justify-center font-montserrat font-black text-white text-xs">
              JOAT
            </div>
            <span className="font-montserrat font-semibold text-white text-sm">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2.5 rounded-xl font-opensans text-sm text-lions-silver hover:text-white hover:bg-white/10 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="font-opensans text-xs text-lions-silver truncate">{session.user.email}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  );
}
