'use client';

import { useState, useEffect } from 'react';
import type { Analytics } from '@/lib/types';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="nf-card rounded-sm p-5 text-center">
      <div className="text-3xl md:text-4xl font-black text-white mb-1">{value}</div>
      <div className="text-neutral-400 font-bold text-[11px] uppercase tracking-[0.15em]">{label}</div>
      {sub && <div className="text-neutral-600 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({ data, color }: { data: Record<string, number>; color: string }) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = sorted[0]?.[1] ?? 1;

  return (
    <div className="space-y-2">
      {sorted.map(([label, count]) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-28 text-right text-sm text-neutral-300 font-semibold truncate">{label}</div>
          <div className="flex-1 h-6 bg-neutral-900 rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{
                width: `${(count / max) * 100}%`,
                background: color,
              }}
            />
          </div>
          <div className="w-8 text-neutral-500 text-sm font-bold">{count}</div>
        </div>
      ))}
      {sorted.length === 0 && (
        <div className="text-neutral-600 text-sm text-center py-4">No data yet</div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <div className="text-neutral-400 animate-pulse text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <div className="text-neutral-400">Failed to load analytics</div>
      </div>
    );
  }

  const avgTimeMin = Math.round(analytics.avgTimeToResolveMs / 60000);
  const avgTimeSec = Math.round(analytics.avgTimeToResolveMs / 1000);
  const timeDisplay = avgTimeMin >= 1 ? `${avgTimeMin}m` : `${avgTimeSec}s`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 fade-up">
      <div className="text-center mb-10">
        <div className="inline-block mb-3 text-[10px] text-[#e50914] font-bold tracking-[0.2em] uppercase">
          Admin Panel
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
          GroupPick <span className="gradient-text">Analytics</span>
        </h1>
        <p className="text-neutral-400 mt-3 text-sm">
          Usage data from all sessions (resets on server restart in dev)
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Sessions Created" value={String(analytics.totalSessions)} />
        <StatCard label="Resolutions" value={String(analytics.totalResolutions)} />
        <StatCard
          label="Resolution Rate"
          value={`${analytics.resolutionRate}%`}
          sub="Sessions that resolved"
        />
        <StatCard
          label="Avg Group Size"
          value={String(analytics.avgGroupSize)}
          sub={analytics.totalResolutions > 0 ? `Avg resolve: ${timeDisplay}` : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="nf-card rounded-sm p-5">
          <h3 className="text-neutral-400 font-bold text-[11px] uppercase tracking-[0.15em] mb-4">
            Top Moods
          </h3>
          <BarChart data={analytics.topMoods} color="#e50914" />
        </div>

        <div className="nf-card rounded-sm p-5">
          <h3 className="text-neutral-400 font-bold text-[11px] uppercase tracking-[0.15em] mb-4">
            Top Genres & Collections
          </h3>
          <BarChart data={analytics.topGenres} color="#f5c518" />
        </div>
      </div>

      {/* Business insight callout */}
      {analytics.totalResolutions > 0 && (
        <div className="mt-10 nf-card rounded-sm p-6 border-[#e50914]/30">
          <h3 className="text-white font-bold text-lg mb-2">Business Insight</h3>
          <p className="text-neutral-300 text-sm leading-relaxed">
            Groups average <span className="text-white font-bold">{analytics.avgGroupSize} people</span> per
            session with a <span className="text-white font-bold">{analytics.resolutionRate}%</span> resolution
            rate. The most popular mood is{' '}
            <span className="text-[#e50914] font-bold">
              {Object.entries(analytics.topMoods).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'}
            </span>
            . Average time from session creation to pick:{' '}
            <span className="text-white font-bold">{timeDisplay}</span>. This data suggests groups who use
            a shared resolver feature watch content faster, reducing browse-time churn.
          </p>
        </div>
      )}

      <div className="text-center mt-8">
        <a href="/" className="btn-ghost font-bold py-3 px-6 rounded-sm inline-block">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
