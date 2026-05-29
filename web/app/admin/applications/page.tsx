'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { api, } from '@/lib/api';
import type { Application } from '@/lib/supabase';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  reviewing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  accepted: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [token, setToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setToken(data.session.access_token);
    });
  }, []);

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.admin.getApplications(token, {
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setApplications(res.applications);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, page]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.admin.updateApplication(token, id, { status });
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: status as Application['status'] } : a))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="font-montserrat font-black text-3xl text-white">
          Applications <span className="text-lions-silver font-normal text-xl">({total})</span>
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-lions-mid border border-white/10 text-white font-opensans text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-lions-blue"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="text-lions-blue animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {applications.length === 0 && (
            <p className="font-opensans text-lions-silver text-center py-12">No applications found.</p>
          )}
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-lions-mid border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-montserrat font-bold text-white truncate">{app.full_name}</h3>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-semibold border capitalize',
                      STATUS_COLORS[app.status]
                    )}
                  >
                    {app.status}
                  </span>
                </div>
                <p className="font-opensans text-lions-silver text-sm">{app.email}</p>
                {app.trade_interest && (
                  <p className="font-opensans text-lions-blue text-xs mt-1">
                    Trade: {app.trade_interest}
                  </p>
                )}
                <p className="font-opensans text-lions-silver/50 text-xs mt-1">
                  {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {app.status !== 'accepted' && (
                  <button
                    onClick={() => updateStatus(app.id, 'accepted')}
                    className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-300 text-xs font-semibold rounded-lg border border-green-600/30 transition-colors"
                  >
                    Accept
                  </button>
                )}
                {app.status !== 'reviewing' && (
                  <button
                    onClick={() => updateStatus(app.id, 'reviewing')}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold rounded-lg border border-blue-600/30 transition-colors"
                  >
                    Review
                  </button>
                )}
                {app.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatus(app.id, 'rejected')}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 text-xs font-semibold rounded-lg border border-red-600/30 transition-colors"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-3 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 bg-lions-mid border border-white/10 text-white text-sm rounded-xl disabled:opacity-40 hover:border-lions-blue transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-lions-silver text-sm font-opensans">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-lions-mid border border-white/10 text-white text-sm rounded-xl disabled:opacity-40 hover:border-lions-blue transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
