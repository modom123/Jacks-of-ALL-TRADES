'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

type Contact = {
  id: string;
  full_name: string;
  email: string;
  subject: string | null;
  message: string;
  type: string;
  status: string;
  created_at: string;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [token, setToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setToken(data.session.access_token);
    });
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.admin.getContacts(token, { page }) as { contacts: Contact[]; total: number };
      setContacts(res.contacts);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  return (
    <div>
      <h1 className="font-montserrat font-black text-3xl text-white mb-8">
        Messages <span className="text-lions-silver font-normal text-xl">({total})</span>
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="text-lions-blue animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.length === 0 && (
            <p className="font-opensans text-lions-silver text-center py-12">No messages found.</p>
          )}
          {contacts.map((c) => (
            <div
              key={c.id}
              className="bg-lions-mid border border-white/10 rounded-2xl p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-montserrat font-bold text-white">{c.full_name}</h3>
                  <p className="font-opensans text-lions-silver text-sm">{c.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-lions-blue/10 text-lions-blue text-xs rounded-full border border-lions-blue/20 capitalize">
                    {c.type}
                  </span>
                  <span className="font-opensans text-lions-silver/50 text-xs">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {c.subject && (
                <p className="font-montserrat font-semibold text-white/80 text-sm mb-2">
                  {c.subject}
                </p>
              )}
              <p className="font-opensans text-lions-silver text-sm leading-relaxed">{c.message}</p>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-3 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 bg-lions-mid border border-white/10 text-white text-sm rounded-xl disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-lions-silver text-sm">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-lions-mid border border-white/10 text-white text-sm rounded-xl disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
