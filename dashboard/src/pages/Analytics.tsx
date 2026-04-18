import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Activity, Search, Download } from 'lucide-react';
import { cn } from '../lib/utils';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';
const APP_KEY = import.meta.env.VITE_APP_KEY || '';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('usage');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [topBibles, setTopBibles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!WORKER_URL || !APP_KEY) {
          throw new Error("VITE_WORKER_URL atau VITE_APP_KEY belum dikonfigurasi di Environment Variables Cloudflare Pages.");
        }

        // 1. Fetch main trend data (Usage)
        const res = await fetch(`${WORKER_URL}/admin/analytics?type=${activeTab}`, {
          headers: { 'X-App-Key': APP_KEY }
        });

        if (!res.ok) {
          throw new Error(`API Worker mengembalikan status ${res.status}.`);
        }

        const json = await res.json();

        if (json.data && Array.isArray(json.data.errors)) {
           throw new Error(json.data.errors[0]?.message || 'Terjadi kesalahan pada kueri GraphQL');
        }

        if (json.data && json.data.viewer && json.data.viewer.accounts) {
           const series = json.data.viewer.accounts[0]?.series || [];

           if (activeTab === 'usage') {
             const chartData = series.map((s: any) => ({
               date: new Date(s.dimensions.datetime).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
               requests: s.sum.doubles || s.sum.requests || 0
             }));
             setData(chartData);

             // 2. Fetch Top Bibles if in Usage tab
             const bibleRes = await fetch(`${WORKER_URL}/admin/analytics?type=bibles`, {
               headers: { 'X-App-Key': APP_KEY }
             });
             const bibleJson = await bibleRes.json();
             const bibleSeries = bibleJson.data?.viewer?.accounts[0]?.series || [];
             setTopBibles(bibleSeries.map((s: any) => ({
               name: s.dimensions.bibleId,
               value: s.sum.requests
             })));
           } else if (activeTab === 'search') {
             const searchData = series.map((s: any) => ({
               query: s.dimensions.query,
               hasResults: s.dimensions.hasResults === 'true' ? '✅' : '❌',
               count: s.sum.count
             }));
             setData(searchData);
           } else if (activeTab === 'download') {
             const downloadData = series.map((s: any) => ({
               date: new Date(s.dimensions.datetime).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
               event: s.dimensions.event,
               count: s.sum.count
             }));
             setData(downloadData);
           }
        } else {
           setData([]);
        }

      } catch (err: any) {
        console.error('Failed to fetch analytics:', err);
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [activeTab]);

  const tabs = [
    { id: 'usage', label: 'Usage', icon: Activity },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'download', label: 'Download', icon: Download },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h2>
        <p className="text-muted-foreground mt-2">Pantau penggunaan API langsung dari data Cloudflare Analytics Engine.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-status-red/10 text-status-red border border-status-red/20 text-sm">
            <strong>Gagal Memuat Analitik:</strong> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Chart */}
          <div className={cn("p-6 rounded-xl border border-border bg-surface shadow-sm", activeTab === 'usage' ? "lg:col-span-2" : "lg:col-span-2")}>
            <div className="mb-6">
              <h3 className="font-semibold text-foreground">
                {activeTab === 'usage' ? 'Request Volume Trend (7 Days)' : 
                 activeTab === 'search' ? 'Top Search Queries' : 
                 'Download Activity Trend'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'usage' ? 'Total permintaan API yang diproses oleh Worker.' : 
                 activeTab === 'search' ? 'Kueri pencarian yang paling sering dilakukan oleh pengguna.' : 
                 'Aktivitas mulai dan selesai unduhan Alkitab luring.'}
              </p>
            </div>

            <div className="h-[300px] w-full">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Memuat data dari Cloudflare...
                </div>
              ) : data.length === 0 && !error ? (
                 <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <p>Belum ada data untuk periode ini.</p>
                  <p className="text-xs mt-2 text-center max-w-sm">Data analytics mungkin membutuhkan waktu hingga 1 jam untuk muncul setelah event pertama.</p>
                </div>
              ) : activeTab === 'usage' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }} itemStyle={{ color: '#fafafa' }} />
                    <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#18181b', stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : activeTab === 'search' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-surface/50 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Query</th>
                        <th className="px-4 py-3">Results</th>
                        <th className="px-4 py-3 text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.map((row, i) => (
                        <tr key={i} className="hover:bg-surface/50">
                          <td className="px-4 py-3 font-medium text-foreground">{row.query}</td>
                          <td className="px-4 py-3">{row.hasResults}</td>
                          <td className="px-4 py-3 text-right">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }} itemStyle={{ color: '#fafafa' }} />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Bibles chart (only in usage tab) */}
          {activeTab === 'usage' && (
            <div className="p-6 rounded-xl border border-border bg-surface shadow-sm lg:col-span-2">
              <div className="mb-6">
                <h3 className="font-semibold text-foreground">Top 10 Bibles Accessed</h3>
                <p className="text-sm text-muted-foreground">Alkitab yang paling sering diakses oleh pengguna.</p>
              </div>
              <div className="h-[300px] w-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">Memuat...</div>
                ) : topBibles.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">Belum ada data bible_accessed.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBibles} layout="vertical" margin={{ left: 40, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }} cursor={{ fill: '#27272a' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {topBibles.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}