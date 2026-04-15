import { useState, useEffect } from 'react'
import { 
  Activity, Settings, Server, RefreshCw, CheckCircle2, Database, Trash2, Search, 
  FileJson, BarChart3, ShieldCheck, Loader2, 
  Globe, Zap, ChevronRight, Lock, Code, LogOut, Layers, History, Cpu
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// --- Mock Data ---
const volumeData = [
  { name: 'Mon', reqs: 4000 }, { name: 'Tue', reqs: 3000 }, { name: 'Wed', reqs: 5000 },
  { name: 'Thu', reqs: 7000 }, { name: 'Fri', reqs: 6000 }, { name: 'Sat', reqs: 9000 }, { name: 'Sun', reqs: 11000 }
];

const topBibles = [
  { id: 'TB', requests: 45000 }, { id: 'NIV', requests: 38000 }, { id: 'KJV', requests: 25000 },
  { id: 'ESV', requests: 12000 }, { id: 'BIMK', requests: 8000 }
];

// --- Main Application Wrapper ---
export default function App() {
  const [route, setRoute] = useState('landing')
  const [workerAppKey, setWorkerAppKey] = useState(localStorage.getItem('workerAppKey') || '')
  
  const isAuthenticated = !!workerAppKey

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') || 'landing'
      setRoute(hash)
    }
    window.addEventListener('hashchange', handleHash)
    handleHash()
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Sidebar Navigation (Conditional) */}
      {route !== 'admin' && route !== 'login' && <PublicNav isAuthenticated={isAuthenticated} />}
      
      {/* Route: Landing */}
      {route === 'landing' && <LandingPage />}

      {/* Route: Docs */}
      {route === 'docs' && <DocsPage />}

      {/* Route: Login */}
      {route === 'login' && (
        <LoginPage 
          onLogin={async (key: string) => {
            setWorkerAppKey(key);
            localStorage.setItem('workerAppKey', key);
            window.location.hash = '#admin';
          }} 
        />
      )}

      {/* Route: Admin Dashboard */}
      {route === 'admin' && (
        <AdminDashboard 
          workerAppKey={workerAppKey} 
          onLogout={() => {
            setWorkerAppKey('');
            localStorage.removeItem('workerAppKey');
            window.location.hash = '#landing';
          }}
        />
      )}
    </div>
  )
}

// --- Page Components ---

function PublicNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#landing" className="flex items-center gap-2 text-zinc-100 font-bold tracking-tighter text-lg group">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
            <Globe className="w-5 h-5 text-emerald-500" />
          </div>
          Hybrid Bible
        </a>
        <div className="flex items-center gap-8 text-sm font-medium">
          <a href="#docs" className="text-zinc-400 hover:text-zinc-100 transition-colors">Docs</a>
          {isAuthenticated ? (
            <a href="#admin" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2">
              <Server className="w-4 h-4" /> Console
            </a>
          ) : (
             <a href="#login" className="bg-zinc-100 hover:bg-white text-zinc-900 px-5 py-2 rounded-full transition-colors flex items-center gap-2 font-bold shadow-lg shadow-white/5">
                <Lock className="w-3.5 h-3.5" /> Login
             </a>
          )}
        </div>
      </div>
    </nav>
  )
}

function LandingPage() {
  return (
    <main className="relative pt-32 pb-24 px-6 overflow-hidden min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-zinc-950 to-zinc-950 -z-10" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] -z-10" />
      
      <div className="max-w-5xl mx-auto text-center space-y-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 text-xs font-bold tracking-widest uppercase shadow-xl">
          <Zap className="w-3.5 h-3.5 fill-emerald-500/20" /> Kinetic System v1.1
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] text-balance">
          Speed up your <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 via-emerald-300 to-cyan-500">
            Bible Experience.
          </span>
        </h1>
        
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium">
          A high-performance Bible API engine hitting Cloudflare R2 Edge Cache. Built for extreme scale, offline-first apps, and real-time kinetic analytics.
        </p>
        
        <div className="flex flex-wrap justify-center gap-5 pt-6">
          <a href="#docs" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-10 py-4 rounded-full font-bold transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3">
            Get Started <ChevronRight className="w-5 h-5" />
          </a>
          <a href="https://github.com/rochardompong/bible-api" target="_blank" rel="noreferrer" className="bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-10 py-4 rounded-full font-bold transition-all flex items-center gap-3 backdrop-blur-md">
            <Code className="w-5 h-5" /> Source
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-24 text-left">
          <FeatureCard icon={Cpu} title="Edge Performance" desc="Sub-50ms latency globally powered by Cloudflare R2 and Workers." />
          <FeatureCard icon={Layers} title="Decoupled Core" desc="Isolated scraper worker ensures 100% uptime for production endpoints." />
          <FeatureCard icon={History} title="Predictive Sync" desc="Advanced pre-fetching logic for seamless offline application state." />
        </div>
      </div>
    </main>
  )
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-3xl backdrop-blur-sm group hover:border-zinc-700 transition-colors">
      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-emerald-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed font-medium">{desc}</p>
    </div>
  )
}

function DocsPage() {
  return (
    <main className="pt-32 pb-24 px-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-16">
        <header className="space-y-4">
          <h1 className="text-5xl font-black text-white tracking-tight">Technical Reference</h1>
          <p className="text-lg text-zinc-500 font-medium">Standard REST endpoints for integrating Hybrid Bible into your mobile project.</p>
        </header>

        <section className="space-y-6">
          <h2 className="text-xl font-bold text-zinc-200 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            Core Endpoints
          </h2>
          <div className="space-y-4">
            <DocEntry method="GET" path="/languages" desc="Retrieve all supported Bible language tags." />
            <DocEntry method="GET" path="/bibles" desc="List available Bible versions in the cache." />
            <DocEntry method="GET" path="/bibles/:id/books" desc="Fetch book metadata for a specific Bible ID." />
            <DocEntry method="GET" path="/bibles/:id/chapters/:cid/verses" desc="Get content for specific chapters." />
            <DocEntry method="GET" path="/verse_of_the_day/:year/:day" desc="Daily verses for the prayer engine." />
          </div>
        </section>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl flex gap-6 items-start">
          <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-white">Edge Authentication</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every request must include the <code className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">X-App-Key</code> header. 
              Endpoints are statically cached on R2 but remain protected via Worker logic.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

function DocEntry({ method, path, desc }: any) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-900/80 px-6 py-4">
        <div className="flex items-center gap-4 font-mono text-sm overflow-hidden">
          <span className="text-blue-500 font-bold">{method}</span>
          <span className="text-zinc-200 truncate">{path}</span>
        </div>
        <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-2 md:mt-0">Edge Cached</div>
      </div>
      <div className="px-6 py-4 text-sm text-zinc-400 font-medium">{desc}</div>
    </div>
  )
}

function LoginPage({ onLogin }: { onLogin: (key: string) => Promise<void> }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const key = e.target.appkey.value;
    const workerUrl = localStorage.getItem('workerUrl') || 'https://bible-api.rochardompong.workers.dev';

    try {
      // Probing the worker to verify the key
      const res = await fetch(`${workerUrl}/admin/r2/list?prefix=ping`, {
        headers: { 'X-App-Key': key }
      });
      
      if (res.status === 401) {
        throw new Error('Invalid Identity Key. Access Denied.');
      }
      if (!res.ok) {
        throw new Error('Could not connect to Worker. Check URL in Settings.');
      }

      onLogin(key);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-zinc-950 to-zinc-950 -z-10" />
      <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-2xl border border-zinc-800/50 p-10 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/20 shadow-inner">
           <ShieldCheck className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-3">Admin Vault</h2>
        <p className="text-zinc-500 text-sm font-medium mb-8">Verification required. Provide your Kinetic Identity Key to access the core console.</p>
        
        <form onSubmit={handleLogin}>
          <div className="space-y-5">
            <input 
              name="appkey" type="password" required placeholder="Identity Key..." 
              className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-5 py-4 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-700"
            />
            {error && <div className="text-red-400 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-shake">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-black py-4 rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock Console'}
            </button>
            <a href="#landing" className="block text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors uppercase font-bold tracking-widest">Return to Home</a>
          </div>
        </form>
      </div>
    </main>
  )
}

// --- Admin Section ---

function AdminDashboard({ workerAppKey, onLogout }: any) {
  const [activeTab, setActiveTab] = useState('overview')
  const [ghRepo, setGhRepo] = useState(localStorage.getItem('ghRepo') || 'owner/repo')
  const [ghToken, setGhToken] = useState(localStorage.getItem('ghToken') || '')
  const [workerUrl, setWorkerUrl] = useState(localStorage.getItem('workerUrl') || 'https://bible-api.rochardompong.workers.dev')
  
  const [r2Files, setR2Files] = useState<any[]>([])
  const [r2Prefix, setR2Prefix] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)
  const [analyticsTab, setAnalyticsTab] = useState('usage')

  useEffect(() => {
    localStorage.setItem('ghRepo', ghRepo)
    localStorage.setItem('ghToken', ghToken)
    localStorage.setItem('workerUrl', workerUrl)
  }, [ghRepo, ghToken, workerUrl])

  const fetchR2Files = async () => {
    try {
      const res = await fetch(`${workerUrl}/admin/r2/list?prefix=${r2Prefix}`, {
        headers: { 'X-App-Key': workerAppKey }
      })
      const data = await res.json()
      setR2Files(data.data || [])
    } catch (err: any) { alert(err.message) }
  }
  const previewR2File = async (key: string) => {
    try {
      const res = await fetch(`${workerUrl}/admin/r2/preview?key=${encodeURIComponent(key)}`, {
        headers: { 'X-App-Key': workerAppKey }
      })
      const data = await res.json()
      setPreviewData(JSON.stringify(data, null, 2))
    } catch (err: any) { alert(err.message) }
  }

  const deleteR2File = async (key: string) => {
    if (!confirm(`Hapus cache ${key}?`)) return
    try {
      await fetch(`${workerUrl}/admin/r2/delete?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { 'X-App-Key': workerAppKey }
      })
      fetchR2Files()
    } catch (err: any) { alert(err.message) }
  }

  const triggerAction = async (target: string, setStatus: any) => {
    if (!ghToken) return alert("GitHub Token required.")
    setStatus('running')
    try {
      await fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/scraper.yml/dispatches`, {
        method: 'POST',
        headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `token ${ghToken}` },
        body: JSON.stringify({ ref: 'main', inputs: { target } })
      })
      setTimeout(() => setStatus('success'), 2000)
    } catch (e) { setStatus('error') }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-950 overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-zinc-950 border-r border-zinc-900 shrink-0 flex flex-col p-8 gap-10">
        <div className="space-y-1">
          <div className="text-[10px] font-black tracking-[0.2em] uppercase text-emerald-500">Console v1.1</div>
          <h1 className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-500" /> Kinetic Core
          </h1>
        </div>

        <nav className="flex flex-col gap-2 flex-grow overflow-y-auto pr-2">
          <SidebarBtn id="overview" label="Overview" icon={Activity} current={activeTab} set={setActiveTab} />
          <SidebarBtn id="scraper" label="Scraper Controller" icon={RefreshCw} current={activeTab} set={setActiveTab} />
          <SidebarBtn id="datacontrol" label="R2 Edge Data" icon={Database} current={activeTab} set={setActiveTab} onClick={fetchR2Files} />
          <SidebarBtn id="analytics" label="Live Analytics" icon={BarChart3} current={activeTab} set={setActiveTab} />
          <SidebarBtn id="settings" label="Vault Settings" icon={Settings} current={activeTab} set={setActiveTab} />
        </nav>

        <div className="pt-6 border-t border-zinc-900 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-emerald-900/20">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Active</span>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-400/5 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-12 scroll-smooth">
        
        {activeTab === 'overview' && (
          <div className="space-y-12 max-w-6xl">
            <header className="space-y-1">
               <h2 className="text-4xl font-black text-white tracking-tight">System Node Status</h2>
               <p className="text-zinc-500 font-medium">Global infrastructure health and cache metrics.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard title="Node Status" value="Online" color="emerald" icon={ShieldCheck} />
              <StatsCard title="Cache Hits" value="98.2%" color="emerald" desc="Global Edge Pop" />
              <StatsCard title="Avg Latency" value="38ms" color="emerald" desc="Cloudflare Workers" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-900 rounded-[2rem] p-8">
                <div className="flex justify-between items-start mb-8">
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Traffic Matrix</h3>
                  <span className="text-[9px] font-black bg-zinc-800 text-zinc-500 px-2 py-1 rounded border border-zinc-700 uppercase">Simulated</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                      <XAxis dataKey="name" stroke="#52525b" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#52525b" fontSize={11} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }} />
                      <Line type="monotone" dataKey="reqs" stroke="#10b981" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-900 rounded-[2rem] p-8">
                <div className="flex justify-between items-start mb-8">
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Bible Load</h3>
                  <span className="text-[9px] font-black bg-zinc-800 text-zinc-500 px-2 py-1 rounded border border-zinc-700 uppercase">Simulated</span>
                </div>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBibles} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="id" type="category" stroke="#a1a1aa" fontSize={12} axisLine={false} tickLine={false} />
                      <Bar dataKey="requests" fill="#10b981" radius={[0, 6, 6, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scraper' && (
          <div className="space-y-12 max-w-5xl">
            <header>
               <h2 className="text-4xl font-black text-white tracking-tight">Orchestrator</h2>
               <p className="text-zinc-500 font-medium">Trigger GitHub Actions workers to sync upstream data.</p>
            </header>
            <div className="bg-zinc-900/50 border border-zinc-900 rounded-[2rem] overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] font-black tracking-widest border-b border-zinc-900">
                    <tr>
                      <th className="px-8 py-5">Target Node</th>
                      <th className="px-8 py-5">State</th>
                      <th className="px-8 py-5 text-right font-mono">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    <ScraperRow title="Language Matrix" tag="ENG, IND + Priority" target="languages" onTrigger={triggerAction} />
                    <ScraperRow title="Bible Metadata" tag="Version indexing" target="bibles" onTrigger={triggerAction} />
                    <ScraperRow title="Content Sync" tag="Books & Chapters" target="books" onTrigger={triggerAction} />
                    <ScraperRow title="Daily Sequence" tag="Verse of the Day" target="votd" onTrigger={triggerAction} />
                    <ScraperRow title="Full Re-Scrape" tag="Heavy override" target="all" onTrigger={triggerAction} isPrimary />
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'datacontrol' && (
          <div className="space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-white tracking-tight">R2 Data Matrix</h2>
                <p className="text-zinc-500 font-medium">Direct management of edge cache nodes.</p>
              </div>
              <button className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-6 py-3 rounded-2xl text-xs font-black tracking-widest transition-all uppercase border border-red-500/20">
                Bulk Purge Cache
              </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
              <div className="bg-zinc-900/30 border border-zinc-900 rounded-[2rem] p-8 flex flex-col gap-6 overflow-hidden">
                <div className="flex gap-3">
                   <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" value={r2Prefix} onChange={(e) => setR2Prefix(e.target.value)}
                      placeholder="Filter by prefix..." 
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-emerald-500 transition-colors placeholder:text-zinc-800 outline-none"
                    />
                  </div>
                  <button onClick={fetchR2Files} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-colors">
                    Fetch
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto border border-zinc-900 rounded-2xl bg-zinc-950/20 custom-scrollbar">
                  {r2Files.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-700 font-bold uppercase tracking-widest">Awaiting Command...</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                       <thead className="bg-zinc-950 text-zinc-600 border-b border-zinc-900 sticky top-0 uppercase font-black">
                        <tr><th className="px-6 py-4">Key Path</th><th className="px-6 py-4 text-right">Actions</th></tr>
                       </thead>
                       <tbody className="divide-y divide-zinc-900">
                        {r2Files.map(f => (
                          <tr key={f.key} className="hover:bg-zinc-900/50 group transition-colors">
                            <td className="px-6 py-4 font-mono text-zinc-400 truncate max-w-[200px] cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => previewR2File(f.key)}>{f.key}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => previewR2File(f.key)} className="p-2 bg-zinc-900 rounded-lg hover:text-emerald-500 transition-colors"><FileJson className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteR2File(f.key)} className="p-2 bg-zinc-900 rounded-lg hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                       </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-4 flex flex-col overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
                <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-300">Read-Only Preview</h3>
                </div>
                <div className="flex-1 overflow-auto p-6 relative z-10">
                   {previewData ? (
                     <pre className="text-[10px] font-mono text-emerald-500/80 leading-relaxed">{previewData}</pre>
                   ) : (
                     <div className="h-full flex items-center justify-center text-xs text-zinc-800 font-bold uppercase tracking-widest">No Node Selected</div>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-12">
            <header>
               <h2 className="text-4xl font-black text-white tracking-tight">Kinetic Insights</h2>
               <p className="text-zinc-500 font-medium">Real-time data flow from Edge Workers.</p>
            </header>
            <div className="grid grid-cols-3 gap-2 border-b border-zinc-900">
               <TabBtn label="Usage Volume" active={analyticsTab === 'usage'} set={() => setAnalyticsTab('usage')} />
               <TabBtn label="Search Intent" active={analyticsTab === 'search'} set={() => setAnalyticsTab('search')} />
               <TabBtn label="App Syncs" active={analyticsTab === 'download'} set={() => setAnalyticsTab('download')} />
            </div>
            <div className="bg-zinc-900/20 border border-zinc-900 p-12 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 min-h-[400px]">
               <div className="w-16 h-16 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-500/40 animate-spin" />
               </div>
               <div className="text-center space-y-2">
                 <h3 className="text-lg font-bold text-white">Phase 3 Integration</h3>
                 <p className="text-sm text-zinc-500 max-w-sm">Live GraphQL connection to Cloudflare Analytics Engine is currently being provisioned.</p>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-12 max-w-2xl">
            <header>
               <h2 className="text-4xl font-black text-white tracking-tight">Vault Configuration</h2>
               <p className="text-zinc-500 font-medium">Sensitive bridge settings for GitHub and Worker API.</p>
            </header>
            <div className="space-y-8">
              <ConfigCard icon={Globe} title="GitHub Logic Bridge" desc="Configure Actions trigger connection.">
                <div className="space-y-4 pt-4">
                  <InputBox label="Repository Target" value={ghRepo} onChange={setGhRepo} />
                  <InputBox label="Private Access Token" value={ghToken} onChange={setGhToken} isPass />
                </div>
              </ConfigCard>
              <ConfigCard icon={Server} title="Worker API Gateway" desc="Configure remote worker endpoint.">
                <div className="space-y-4 pt-4">
                  <InputBox label="Worker HTTPS URL" value={workerUrl} onChange={setWorkerUrl} />
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Active X-App-Key</label>
                    <div className="w-full bg-zinc-950 border border-emerald-950 px-5 py-4 rounded-2xl text-emerald-500 text-sm font-mono flex items-center justify-between">
                      <span>HIDDEN_SIGNATURE_NODE</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </ConfigCard>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// --- Internal Helper Components ---

function SidebarBtn({ id, label, icon: Icon, current, set, onClick }: any) {
  const active = current === id
  return (
    <button 
      onClick={() => { set(id); if (onClick) onClick(); }}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${active ? 'bg-zinc-900 border border-zinc-800 text-emerald-400' : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300 border border-transparent'}`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : ''}`} />
      {label}
    </button>
  )
}

function StatsCard({ title, value, color, icon: Icon, desc }: any) {
  const c = color === 'emerald' ? 'text-emerald-500' : 'text-zinc-100'
  return (
    <div className="bg-zinc-900/40 border border-zinc-900 p-8 rounded-[2rem] flex flex-col justify-between min-h-[160px] group transition-all hover:border-zinc-700">
      <div className="flex justify-between items-start">
        <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{title}</span>
        {Icon && <Icon className={`w-5 h-5 ${c}`} />}
      </div>
      <div>
        <div className={`text-4xl font-black tracking-tighter ${c}`}>{value}</div>
        {desc && <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600 mt-2">{desc}</p>}
      </div>
    </div>
  )
}

function ScraperRow({ title, tag, target, onTrigger, isPrimary }: any) {
  const [status, setStatus] = useState('idle')
  return (
    <tr className="hover:bg-zinc-900/30 transition-colors">
      <td className="px-8 py-6">
        <div className="font-bold text-zinc-100 text-base">{title}</div>
        <div className="text-xs text-zinc-500 font-medium mt-1 uppercase tracking-widest">{tag}</div>
      </td>
      <td className="px-8 py-6">
        {status === 'idle' && <span className="text-xs font-black uppercase tracking-widest text-zinc-600">Idle</span>}
        {status === 'running' && <span className="text-xs font-black uppercase tracking-widest text-amber-500 animate-pulse">Running</span>}
        {status === 'success' && <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Synced</span>}
        {status === 'error' && <span className="text-xs font-black uppercase tracking-widest text-red-500">Failed</span>}
      </td>
      <td className="px-8 py-6 text-right">
        <button 
          disabled={status === 'running'}
          onClick={() => onTrigger(target, setStatus)}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPrimary ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-zinc-900 text-zinc-200 border border-zinc-800 hover:bg-zinc-800 opacity-50 hover:opacity-100'}`}
        >
          Initialize
        </button>
      </td>
    </tr>
  )
}

function ConfigCard({ icon: Icon, title, desc, children }: any) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-900 rounded-[2.5rem] p-10 space-y-4">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-900 flex items-center justify-center">
          <Icon className="w-6 h-6 text-zinc-400" />
        </div>
        <div>
          <h3 className="font-black text-white text-lg tracking-tight">{title}</h3>
          <p className="text-xs text-zinc-500 font-medium leading-relaxed">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function InputBox({ label, value, onChange, isPass }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{label}</label>
      <input 
        type={isPass ? 'password' : 'text'}
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl px-5 py-4 text-sm text-zinc-200 outline-none focus:border-zinc-700 transition-colors"
      />
    </div>
  )
}

function TabBtn({ label, active, set }: any) {
  return (
    <button 
      onClick={set}
      className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${active ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
    >
      {label}
    </button>
  )
}
