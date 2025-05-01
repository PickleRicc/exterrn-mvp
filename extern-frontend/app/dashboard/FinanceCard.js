// FinanceCard.js - Dashboard finance summary card
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFinanceStats } from '../../lib/api/financesAPI';

export default function FinanceCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getFinanceStats('month')
      .then(data => {
        setStats(data);
        setError('');
      })
      .catch(() => setError('Kann Finanzen nicht laden'))
      .finally(() => setLoading(false));
  }, []);

  const progress = stats?.goal && stats.totalRevenue
    ? Math.min(100, Math.round((Number(stats.totalRevenue) / Number(stats.goal.goal_amount)) * 100))
    : 0;
  let progressColor = 'bg-green-500';
  if (progress < 50) progressColor = 'bg-red-500';
  else if (progress < 80) progressColor = 'bg-orange-400';

  return (
    <Link href="/finances" className="bg-[#132f4c] hover:bg-[#1a406a] transition-colors rounded-2xl shadow-xl border border-white/10 p-5 flex flex-col gap-3 min-w-[220px] flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">💶</span>
        <span className="font-bold text-white text-lg">Finanzen</span>
      </div>
      {loading ? (
        <div className="text-blue-200 text-sm">Lädt...</div>
      ) : error ? (
        <div className="text-red-400 text-sm">{error}</div>
      ) : stats.goal ? (
        <>
          <div className="text-pink-300 text-sm mb-1">Ziel: €{Number(stats.goal.goal_amount).toLocaleString('de-DE')}</div>
          <div className="w-full h-2 bg-blue-900 rounded overflow-hidden mb-1">
            <div className={`${progressColor} h-2 transition-all duration-500`} style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-white mb-1">{progress}% erreicht</div>
          <div className="flex gap-2 text-xs">
            <span className="text-green-400">Einnahmen: €{Number(stats.totalRevenue).toLocaleString('de-DE')}</span>
            <span className="text-orange-300">Offen: €{Number(stats.totalOpen).toLocaleString('de-DE')}</span>
          </div>
        </>
      ) : (
        <div className="text-white/60 text-sm">Kein Ziel gesetzt</div>
      )}
    </Link>
  );
}
