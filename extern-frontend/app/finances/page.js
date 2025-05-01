"use client";
import { useEffect, useState } from 'react';
import { getFinanceStats, setFinanceGoal } from '../../lib/api/financesAPI';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PERIODS = [
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
  { label: 'All', value: 'all' },
];

export default function FinancesPage() {
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goalInput, setGoalInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getFinanceStats(period)
      .then(data => {
        if (!data || !data.goal) {
          setStats(null);
          setGoalInput('');
          setError('No finance goal set yet. Please add your revenue goal below.');
        } else {
          setStats(data);
          setGoalInput(data.goal.goal_amount || '');
          setError('');
        }
      })
      .catch(() => setError('Could not load finance stats'))
      .finally(() => setLoading(false));
  }, [period]);

  const handleGoalSave = async () => {
    if (!goalInput || isNaN(goalInput)) {
      setError('Please enter a valid number');
      return;
    }
    setLoading(true);
    try {
      await setFinanceGoal(goalInput, period);
      setEditing(false);
      setError('');
      // Refresh stats
      const data = await getFinanceStats(period);
      setStats(data);
      setGoalInput(data.goal?.goal_amount || '');
    } catch {
      setError('Could not update goal');
    } finally {
      setLoading(false);
    }
  };

  // Progress calculation
  const progress = stats?.goal && stats.totalRevenue
    ? Math.min(100, Math.round((Number(stats.totalRevenue) / Number(stats.goal.goal_amount)) * 100))
    : 0;
  let progressColor = 'bg-green-500';
  if (progress < 50) progressColor = 'bg-red-500';
  else if (progress < 80) progressColor = 'bg-orange-400';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-6 md:p-8 animate-fade-in max-w-xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-[#e91e63] to-[#00c2ff] bg-clip-text text-transparent">
                  Finances
                </span>
              </h1>
              <p className="text-white/70">Track your revenue goal & earnings</p>
            </div>
            <div className="flex gap-2 mt-3 md:mt-0">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  className={`px-3 py-1 rounded text-sm font-medium focus:outline-none transition-colors border border-pink-500/30 ${period === p.value ? 'bg-pink-600 text-white' : 'bg-blue-900 text-pink-300 hover:bg-pink-800/30'}`}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-red-100/90 backdrop-blur-sm text-red-700 rounded-xl border border-red-200/50 shadow-lg animate-slide-up flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"></path></svg>
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-blue-200">Loading...</div>
          ) : (
            <div className="bg-[#132f4c] rounded-xl p-5 shadow-md">
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <span className="text-lg font-semibold text-white mr-2">Revenue Goal:</span>
                  {editing || !stats ? (
                    <>
                      <input
                        type="number"
                        min="0"
                        value={goalInput}
                        placeholder="Enter your monthly goal (€)"
                        onChange={e => setGoalInput(e.target.value)}
                        className="px-2 py-1 rounded bg-blue-950 text-white border border-pink-400 w-32 mr-2"
                      />
                      <button className="text-pink-400 font-bold mr-2" onClick={handleGoalSave}>Save</button>
                      {stats && <button className="text-white" onClick={() => { setEditing(false); setGoalInput(stats.goal?.goal_amount || ''); }}>Cancel</button>}
                    </>
                  ) : (
                    <>
                      <span className="text-pink-300">{stats.goal ? `€${Number(stats.goal.goal_amount).toLocaleString('en-US')}` : 'No goal set'}</span>
                      <button className="ml-3 text-pink-400 underline text-sm" onClick={() => setEditing(true)}>Edit</button>
                    </>
                  )}
                </div>
                {stats && stats.goal && (
                  <div className="w-full h-4 bg-blue-900 rounded overflow-hidden">
                    <div
                      className={`${progressColor} h-4 transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                {stats && stats.goal && (
                  <div className="mt-2 text-sm text-white">
                    {progress}% reached (
                    €{Number(stats.totalRevenue).toLocaleString('en-US')} of €{Number(stats.goal.goal_amount).toLocaleString('en-US')}
                    )
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <div className="flex-1 bg-blue-950 rounded-lg p-4 text-center">
                  <div className="text-xs text-blue-300 mb-1">Revenue (paid)</div>
                  <div className="text-xl font-bold text-green-400">€{stats ? Number(stats.totalRevenue).toLocaleString('en-US') : '0'}</div>
                </div>
                <div className="flex-1 bg-blue-950 rounded-lg p-4 text-center">
                  <div className="text-xs text-blue-300 mb-1">Outstanding (unpaid)</div>
                  <div className="text-xl font-bold text-orange-300">€{stats ? Number(stats.totalOpen).toLocaleString('en-US') : '0'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}