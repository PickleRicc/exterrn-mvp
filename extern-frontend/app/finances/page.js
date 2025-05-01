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

// Helper to format month names for the chart
const formatMonth = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { month: 'short' });
};

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
          setStats({
            ...data,
            goal: null
          });
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
  
  // Use consistent brand colors for progress bar
  let progressColor = 'bg-[#e91e63]';
  if (progress < 30) progressColor = 'bg-red-500';
  else if (progress < 70) progressColor = 'bg-amber-500';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <Header />
      <main className="flex-grow container mx-auto px-5 py-8">
        <div className="bg-[#132f4c]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-6 md:p-8 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">
                Finances
              </h1>
              <p className="text-white/70">Track your revenue goal & earnings</p>
            </div>
            <div className="flex gap-2 mt-3 md:mt-0">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium focus:outline-none transition-colors ${period === p.value ? 'bg-[#e91e63] text-white' : 'bg-[#1e3a5f] text-white hover:bg-[#e91e63]/20'}`}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-sm text-white rounded-xl border border-red-500/30 shadow-lg flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e91e63]"></div>
            </div>
          ) : (
            <>
              <div className="bg-[#1e3a5f] rounded-xl p-5 shadow-md mb-6">
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <span className="text-lg font-semibold text-white mr-2">Revenue Goal:</span>
                    {editing || !stats?.goal ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          value={goalInput}
                          placeholder="Enter your goal (€)"
                          onChange={e => setGoalInput(e.target.value)}
                          className="px-3 py-1.5 rounded bg-[#132f4c] text-white border border-[#e91e63]/50 focus:border-[#e91e63] focus:outline-none w-32 mr-2"
                        />
                        <button 
                          className="px-3 py-1.5 rounded-full bg-[#e91e63] hover:bg-[#d81b60] text-white font-medium transition-colors mr-2" 
                          onClick={handleGoalSave}
                        >
                          Save
                        </button>
                        {stats?.goal && (
                          <button 
                            className="px-3 py-1.5 rounded-full bg-[#1e3a5f] border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors" 
                            onClick={() => { setEditing(false); setGoalInput(stats.goal?.goal_amount || ''); }}
                          >
                            Cancel
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[#e91e63] font-semibold">€{Number(stats.goal.goal_amount).toLocaleString('en-US')}</span>
                        <button 
                          className="ml-3 text-[#e91e63] hover:text-[#f06292] text-sm flex items-center" 
                          onClick={() => setEditing(true)}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                  {stats?.goal && (
                    <div className="w-full h-3 bg-[#132f4c] rounded-full overflow-hidden mt-3">
                      <div
                        className={`${progressColor} h-3 transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  {stats?.goal && (
                    <div className="mt-2 text-sm text-white/80">
                      <span className="font-medium text-white">{progress}%</span> reached (
                      €{Number(stats.totalRevenue).toLocaleString('en-US')} of €{Number(stats.goal.goal_amount).toLocaleString('en-US')}
                      )
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <div className="flex-1 bg-[#132f4c] rounded-lg p-4 text-center">
                    <div className="text-xs text-white/70 mb-1 uppercase tracking-wider">Revenue (paid)</div>
                    <div className="text-xl font-bold text-white">€{stats ? Number(stats.totalRevenue).toLocaleString('en-US') : '0'}</div>
                  </div>
                  <div className="flex-1 bg-[#132f4c] rounded-lg p-4 text-center">
                    <div className="text-xs text-white/70 mb-1 uppercase tracking-wider">Outstanding (unpaid)</div>
                    <div className="text-xl font-bold text-white">€{stats && stats.totalOpen ? Number(stats.totalOpen).toLocaleString('en-US') : '0'}</div>
                  </div>
                </div>
              </div>

              {/* Monthly breakdown chart (only show for yearly view) */}
              {period === 'year' && stats?.monthlyRevenueData && stats.monthlyRevenueData.length > 0 && (
                <div className="bg-[#1e3a5f] rounded-xl p-5 shadow-md">
                  <h2 className="text-lg font-semibold text-white mb-4">Monthly Revenue Breakdown</h2>
                  <div className="h-60 flex items-end justify-between gap-1">
                    {stats.monthlyRevenueData.map((item, index) => {
                      // Calculate height percentage (max 95%)
                      const maxRevenue = Math.max(...stats.monthlyRevenueData.map(d => Number(d.revenue)));
                      const heightPercent = maxRevenue > 0 
                        ? Math.max(5, Math.round((Number(item.revenue) / maxRevenue) * 95)) 
                        : 5;
                      
                      return (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full bg-[#e91e63] rounded-t-md transition-all duration-300 hover:bg-[#f06292]"
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                          <div className="text-xs text-white mt-2">{formatMonth(item.month)}</div>
                          <div className="text-xs text-white/70">€{Number(item.revenue).toLocaleString('en-US')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}