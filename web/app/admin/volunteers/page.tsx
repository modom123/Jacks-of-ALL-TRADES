'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

type Volunteer = {
  id: string;
  full_name: string;
  email: string;
  trade_skill: string | null;
  role: string | null;
  status: string;
  created_at: string;
};

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [token, setToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setToken(data.session.access_token);
    });
  }, []);

  const fetchVolunteers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.admin.getVolunteers(token, { page }) as { volunteers: Volunteer[]; total: number };
      setVolunteers(res.volunteers);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { fetchVolunteers(); }, [fetchVolunteers]);

  return (
    <div>
      <h1 className="font-montserrat font-black text-3xl text-white mb-8">
        Volunteers <span className="text-lions-silver font-normal text-xl">({total})</span>
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="text-lions-blue animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {volunteers.length === 0 && (
            <p className="font-opensans text-lions-silver text-center py-12 col-span-2">No volunteers yet.</p>
          )}
          {volunteers.map((v) => (
            <div key={v.id} className="bg-lions-mid border border-white/10 rounded-2xl p-5">
              <h3 className="font-montserrat font-bold text-white mb-1">{v.full_name}</h3>
              <p className="font-opensans text-lions-silver text-sm mb-2">{v.email}</p>
              {v.trade_skill && (
                <p className="font-opensans text-lions-blue text-xs mb-1">Skill: {v.trade_skill}</p>
              )}
              {v.role && (
                <p className="font-opensans text-lions-silver/70 text-xs">Role: {v.role}</p>
              )}
              <p className="font-opensans text-lions-silver/40 text-xs mt-2">
                {new Date(v.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
