'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

type Donation = {
  id: string;
  donor_name: string | null;
  donor_email: string | null;
  amount_cents: number;
  type: string | null;
  status: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [token, setToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setToken(data.session.access_token);
    });
  }, []);

  const fetchDonations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.admin.getDonations(token, { page }) as { donations: Donation[]; total: number };
      setDonations(res.donations);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  const totalRaised = donations
    .filter((d) => d.status === 'completed')
    .reduce((sum, d) => sum + d.amount_cents, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-montserrat font-black text-3xl text-white">
          Donations <span className="text-lions-silver font-normal text-xl">({total})</span>
        </h1>
        <div className="bg-lions-mid border border-white/10 rounded-xl px-4 py-2 text-right">
          <div className="font-montserrat font-black text-green-400 text-xl">
            ${(totalRaised / 100).toFixed(2)}
          </div>
          <div className="font-opensans text-lions-silver text-xs">on this page</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="text-lions-blue animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {donations.length === 0 && (
            <p className="font-opensans text-lions-silver text-center py-12">No donations found.</p>
          )}
          {donations.map((d) => (
            <div
              key={d.id}
              className="bg-lions-mid border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-montserrat font-bold text-white">
                  {d.donor_name || 'Anonymous'}
                </h3>
                <p className="font-opensans text-lions-silver text-sm">{d.donor_email || '—'}</p>
                <p className="font-opensans text-lions-silver/50 text-xs mt-1">
                  {d.type} · {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-montserrat font-black text-2xl text-white mb-1">
                  ${(d.amount_cents / 100).toFixed(2)}
                </div>
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold border capitalize',
                    STATUS_COLORS[d.status] || 'bg-white/10 text-white border-white/20'
                  )}
                >
                  {d.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-3 mt-8">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 bg-lions-mid border border-white/10 text-white text-sm rounded-xl disabled:opacity-40">
            Previous
          </button>
          <span className="px-4 py-2 text-lions-silver text-sm">Page {page} of {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-lions-mid border border-white/10 text-white text-sm rounded-xl disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
