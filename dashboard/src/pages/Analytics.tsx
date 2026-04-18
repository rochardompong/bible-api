import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Search, Download } from 'lucide-react';
import { cn } from '../lib/utils';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';
const APP_KEY = import.meta.env.VITE_APP_KEY || '';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('usage');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!WORKER_URL || !APP_KEY) {
          throw new Error("VITE_WORKER_URL atau VITE_APP_KEY belum dikonfigurasi di Environment Variables Cloudflare Pages.");
        }

        const res = await fetch(`${WORKER_URL}/admin/analytics?type=${activeTab}`, {
          headers: { 'X-App-Key': APP_KEY }
        });
        
        if (!res.ok) {
          throw new Error(`API Worker mengembalikan status ${res.status}. Pastikan kredensial Analytics di Worker sudah disetel.`);
        }
        
        const json = await res.json();
        
        // Cek apakah response dari Cloudflare GraphQL mengandung error
        if (json.data && Array.isArray(json.data.errors)) {
           throw new Error(json.data.errors[0]?.message || 'Terjadi kesalahan pada kueri GraphQL Cloudflare Analytics');
        }

        if (json.data && json.data.viewer && json.data.viewer.accounts) {
           const series = json.data.viewer.accounts[0]?.series || [];
           const chartData = series.map((s: any) => ({
             date: new Date(s.dimensions.datetime).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
             requests: s.sum.doubles
           }));
           setData(chartData);
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
        
        <div className="grid grid-cols-1 gap-6">
          {/* Chart 1: Request Volume Trend */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-sm">
            <div className="mb-6">
              <h3 className="font-semibold text-foreground">Request Volume Trend (7 Days)</h3>
              <p className="text-sm text-muted-foreground">Total permintaan API yang diproses oleh Worker.</p>
            </div>
            
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Memuat data dari Cloudflare...
                </div>
              ) : data.length === 0 && !error ? (
                 <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <p>Belum ada data untuk 7 hari terakhir.</p>
                  <p className="text-xs mt-2 text-center max-w-sm">Pastikan Analytics Engine Dataset "ANALYTICS" sudah di-binding di Worker Anda dan ada request masuk.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#a1a1aa" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="#a1a1aa" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                      itemStyle={{ color: '#fafafa' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="requests" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#18181b', stroke: '#3b82f6', strokeWidth: 2 }} 
                      activeDot={{ r: 6, fill: '#3b82f6' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          
          {/* Peringatan: Fitur Analitik Lanjutan Membutuhkan Tambahan Query GraphQL Backend */}
          {activeTab === 'usage' && (
            <div className="p-6 rounded-xl border border-border border-dashed bg-surface/50 shadow-sm flex items-center justify-center h-[250px]">
              <div className="text-center max-w-md">
                 <h3 className="font-semibold text-foreground mb-2">Top Bibles Accessed</h3>
                 <p className="text-sm text-muted-foreground">Membutuhkan ekstensi kueri GraphQL di Worker (`worker/src/index.ts`) untuk mengambil dimensi 'bibleId' dari Cloudflare Analytics Engine sebelum dapat ditampilkan di sini.</p>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="p-6 rounded-xl border border-border border-dashed bg-surface/50 shadow-sm flex items-center justify-center h-[300px]">
              <div className="text-center max-w-md">
                 <h3 className="font-semibold text-foreground mb-2">Search Analytics</h3>
                 <p className="text-sm text-muted-foreground">Fitur pencatatan kueri pencarian (Phase 3) akan ditampilkan di sini. Membutuhkan ekstensi kueri GraphQL di Worker.</p>
              </div>
            </div>
          )}
          
          {activeTab === 'download' && (
            <div className="p-6 rounded-xl border border-border border-dashed bg-surface/50 shadow-sm flex items-center justify-center h-[300px]">
              <div className="text-center max-w-md">
                 <h3 className="font-semibold text-foreground mb-2">Download Analytics</h3>
                 <p className="text-sm text-muted-foreground">Statistik unduhan Alkitab luring (offline) akan ditampilkan di sini. Membutuhkan ekstensi kueri GraphQL di Worker.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}