import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getStats(token: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const stats = session ? await getStats(session.access_token) : null;

  const cards = [
    { label: 'Pending Applications', value: stats?.pending_applications ?? '—', color: 'text-yellow-400' },
    { label: 'Total Donations', value: stats ? `$${stats.total_donations_dollars}` : '—', color: 'text-green-400' },
    { label: 'Unread Messages', value: stats?.unread_messages ?? '—', color: 'text-blue-400' },
    { label: 'Volunteers', value: stats?.volunteer_count ?? '—', color: 'text-purple-400' },
  ];

  return (
    <div>
      <h1 className="font-montserrat font-black text-3xl text-white mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-lions-mid border border-white/10 rounded-2xl p-6"
          >
            <div className={`font-montserrat font-black text-3xl mb-1 ${card.color}`}>
              {card.value}
            </div>
            <div className="font-opensans text-lions-silver text-sm">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {[
          { label: 'Review Applications', href: '/admin/applications', desc: 'View and update application statuses' },
          { label: 'View Contacts', href: '/admin/contacts', desc: 'Read messages from the contact form' },
          { label: 'Donation History', href: '/admin/donations', desc: 'Track all financial contributions' },
          { label: 'Volunteers', href: '/admin/volunteers', desc: 'Manage volunteer sign-ups' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="bg-lions-mid border border-white/10 hover:border-lions-blue/50 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5 group"
          >
            <h3 className="font-montserrat font-bold text-white mb-1 group-hover:text-lions-blue transition-colors">
              {link.label}
            </h3>
            <p className="font-opensans text-lions-silver text-sm">{link.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
