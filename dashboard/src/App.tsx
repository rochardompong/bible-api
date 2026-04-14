import { useState, useEffect } from 'react'
import { Activity, Settings, Server, RefreshCw, CheckCircle2, Database, Trash2, Search, FileJson, BarChart3, LineChart as LineChartIcon, ShieldCheck, XCircle, Loader2, Globe, Zap, ChevronRight, Lock, Code, LogOut, BookOpen } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Mock Data (Used in Dashboard Overview Charts)
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
  
  // App Global State
  const [workerAppKey, setWorkerAppKey] = useState(localStorage.getItem('workerAppKey') || '')
  
  const isAuthenticated = !!workerAppKey
  
  // Hash Routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') || 'landing'
      setRoute(hash)
    }
    window.addEventListener('hashchange', handleHash)
    handleHash() // Read initial
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // Public Navbar
  const PublicNav = () => (
    <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#landing" className="flex items-center gap-2 text-zinc-100 font-bold tracking-tighter text-lg">
          <Globe className="w-5 h-5 text-emerald-500" /> Hybrid Bible API
        </a>
        <div className="flex items-center gap-6 text-sm font-medium">
          <a href="#docs" className="text-zinc-400 hover:text-zinc-100 transition-colors">Documentation</a>
          {isAuthenticated ? (
            <a href="#admin" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2">
              <Server className="w-4 h-4" /> Go to Console
            </a>
          ) : (
             <a href="#login" className="bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 rounded-full transition-colors flex items-center gap-2 font-bold">
               <Lock className="w-3.5 h-3.5" /> Admin Login
             </a>
          )}
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {route !== 'admin' && route !== 'login' && <PublicNav />}
      
      {/* Route: Landing */}
      {route === 'landing' && (
        <main className="pt-32 pb-24 px-6 flex flex-col items-center justify-center min-h-screen animate-in fade-in zoom-in-95 duration-700">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950 to-zinc-950 -z-10" />
          <div className="relative max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase">
              <Zap className="w-3.5 h-3.5" /> Kinetic System v1.0
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter leading-tight">
              The Next-Gen <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                Hybrid Bible Endpoint.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Decoupled scraping architecture hitting Cloudflare R2 Edge Cache. Lightning fast, natively analytical, built for massive offline scale.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <a href="#docs" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-8 py-3 rounded-full font-bold transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] flex items-center gap-2">
                Explore Endpoints <ChevronRight className="w-4 h-4" />
              </a>
              <a href="https://github.com/rochardompong/bible-api" target="_blank" rel="noreferrer" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2">
                <Code className="w-4 h-4" /> View Source
              </a>
            </div>
          </div>
        </main>
      )}

      {/* Route: Docs */}
      {route === 'docs' && (
        <main className="pt-32 pb-24 px-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="space-y-12">
             <header>
               <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">API Documentation</h1>
               <p className="text-zinc-400">Integrate the Hybrid Bible into your mobile applications using standard REST protocols.</p>
             </header>

             <div className="space-y-6">
               <DocSection method="GET" path="/languages" desc="Get all available priority languages." />
               <DocSection method="GET" path="/bibles" desc="Get the list of scraped bibles." />
               <DocSection method="GET" path="/bibles/:bible_id/books" desc="Get all books for a specific bible (e.g. TB)." />
               <DocSection method="GET" path="/bibles/:bible_id/chapters/:chapter_id/verses" desc="Get verses by chapter id (e.g. GEN.1)." />
               <DocSection method="GET" path="/bibles/:bible_id/index" desc="Get custom offline-first bundled index of books and chapters." />
               <DocSection method="GET" path="/verse_of_the_day/:year/:day" desc="Get the Verse of the Day (Day of year 1-365)." />
               
               <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex gap-4 mt-12 text-sm text-amber-200/80">
                 <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                 <div>
                   <strong className="text-amber-500 block mb-1">Important Implementation Detail</strong>
                   Our worker API strictly enforces API protection. You must pass <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-500 font-mono text-xs">X-App-Key</code> header dynamically in your app to retrieve the payload.
                 </div>
               </div>
             </div>
           </div>
        </main>
      )}

      {/* Route: Login */}
      {route === 'login' && (
        <main className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 relative overflow-hidden">
          <div className="absolute top-8 left-8">
            <a href="#landing" className="text-zinc-500 hover:text-zinc-300 font-medium text-sm flex items-center gap-2 transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
            </a>
          </div>
          
          <div className="w-full max-w-sm bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
               <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Admin Identity</h2>
            <p className="text-zinc-400 text-sm mb-8">Enter your Cloudflare Worker Authentication Key to unlock system access.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const val = (e.target as any).elements.appkey.value;
              setWorkerAppKey(val);
              localStorage.setItem('workerAppKey', val);
              window.location.hash = '#admin';
            }}>
              <div className="space-y-4">
                <input 
                  name="appkey"
                  type="password" 
                  required
                  placeholder="X-App-Key Target..." 
                  className="w-full bg-black/50 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-600"
                />
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl transition-colors">
                  Unlock Console
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {/* Route: Admin Dashboard */}
      {route === 'admin' && (
        <AdminDashboard 
          workerAppKey={workerAppKey} 
          setWorkerAppKey={setWorkerAppKey}
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

function DocSection({ method, path, desc }: { method: string, path: string, desc: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-zinc-900 px-5 py-4 border-b border-zinc-800">
        <span className={`px-2 py-1 rounded text-xs font-bold tracking-wider ${method === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
          {method}
        </span>
        <code className="text-zinc-300 font-mono text-sm break-all">{path}</code>
      </div>
      <div className="px-5 py-4 text-sm text-zinc-400">
        {desc}
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// COMPACT DASHBOARD LOGIC FROM EARLIER (WRAPPED AS COMPONENT)
// ------------------------------------------------------------
function AdminDashboard({ workerAppKey, setWorkerAppKey, onLogout }: any) {
  const [activeTab, setActiveTab] = useState('overview')
  
  // Settings Global States
  const [ghRepo, setGhRepo] = useState(localStorage.getItem('ghRepo') || 'owner/repo')
  const [ghToken, setGhToken] = useState(localStorage.getItem('ghToken') || '')
  const [workerUrl, setWorkerUrl] = useState(localStorage.getItem('workerUrl') || 'http://127.0.0.1:8787')
  
  const [r2Files, setR2Files] = useState<any[]>([])
  const [r2Prefix, setR2Prefix] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)
  
  const [analyticsTab, setAnalyticsTab] = useState('usage')

  useEffect(() => {
    localStorage.setItem('ghRepo', ghRepo)
    localStorage.setItem('ghToken', ghToken)
    localStorage.setItem('workerUrl', workerUrl)
  }, [ghRepo, ghToken, workerUrl])

  // --- Handlers ---
  const triggerGithubAction = async (target: string, setStatus?: (s: string) => void) => {
    if (!ghToken || ghRepo === 'owner/repo') {
      alert("Harap konfigurasi GitHub Repo dan Token di pengaturan.")
      return;
    }
    if (setStatus) setStatus('running')
    try {
      const payload: any = { ref: 'main', inputs: { target } }
      await fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/scraper.yml/dispatches`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${ghToken}`
        },
        body: JSON.stringify(payload)
      })
      setTimeout(() => { if (setStatus) setStatus('success') }, 2000)
    } catch (e: any) {
      if (setStatus) setStatus('error')
      alert(`Gagal trigger Action: ${e.message}`)
    }
  }

  const fetchR2Files = async () => {
    try {
      const res = await fetch(`${workerUrl}/admin/r2/list?prefix=${r2Prefix}`, {
        headers: { 'X-App-Key': workerAppKey }
      })
      if (!res.ok) throw new Error('Failed to list files. Check API URL and App-Key.')
      const data = await res.json()
      setR2Files(data.data || [])
    } catch (err: any) {
      alert(err.message)
    }
  }

  const previewR2File = async (key: string) => {
    try {
      const res = await fetch(`${workerUrl}/admin/r2/preview?key=${encodeURIComponent(key)}`, {
        headers: { 'X-App-Key': workerAppKey }
      })
      const data = await res.json()
      setPreviewData(JSON.stringify(data, null, 2))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const deleteR2File = async (key: string) => {
    if (!confirm(`Hapus cache ${key}?`)) return
    try {
      await fetch(`${workerUrl}/admin/r2/delete?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { 'X-App-Key': workerAppKey }
      })
      fetchR2Files()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const bulkDeleteBible = async () => {
    const bibleId = prompt("Masukkan Bible ID untuk BULK DELETE cache terkait:")
    if (!bibleId) return
    try {
      const res = await fetch(`${workerUrl}/admin/r2/bulk-delete?bible_id=${encodeURIComponent(bibleId)}`, {
        method: 'DELETE',
        headers: { 'X-App-Key': workerAppKey }
      })
      const data = await res.json()
      alert(`Berhasil menghapus ${data.data.deletedCount} file cache untuk Bible ${bibleId}`)
      fetchR2Files()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900/50 border-r border-zinc-800/80 md:h-screen shrink-0 px-5 py-8 flex flex-col gap-6 overflow-y-auto">
        <div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-500/70 mb-2 block">Secure Session</span>
          <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            Hybrid Console
          </h1>
        </div>

        <nav className="flex flex-col gap-1.5 flex-grow">
          {SidebarItem('overview', 'Overview', Activity, activeTab, setActiveTab)}
          {SidebarItem('scraper', 'Scraper', RefreshCw, activeTab, setActiveTab)}
          {SidebarItem('datacontrol', 'Data Control', Database, activeTab, setActiveTab, () => { fetchR2Files() })}
          {SidebarItem('analytics', 'Analytics', BarChart3, activeTab, setActiveTab)}
          {SidebarItem('settings', 'Settings', Settings, activeTab, setActiveTab)}
        </nav>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-emerald-900/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Online</span>
            </div>
          </div>
          <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors">
            <LogOut className="w-4 h-4" /> End Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto bg-zinc-950">
        
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 max-w-6xl animate-in fade-in duration-500">
            <header>
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">System Overview</h2>
              <p className="text-sm text-zinc-500 mt-1">Real-time health and metrics for Hybrid Bible API.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard title="System Status" value="UP" color="emerald" icon={ShieldCheck} />
              <MetricCard title="Cache Hit Rate" value="98.2%" color="emerald" desc="Target > 80%" />
              <MetricCard title="Error Rate" value="0.05%" color="emerald" desc="Target < 1%" />
              <MetricCard title="Quota Usage" value="880/1000" color="amber" desc="Req/h User" />
              <MetricCard title="Global Latency" value="42ms" color="emerald" desc="R2 Cache Hit" />
              <MetricCard title="Last Run" value="SUCCESS" color="emerald" desc="12 mins ago" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-zinc-400" /> Request Volume (Last 7 Days)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="reqs" stroke="#10b981" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                 <h3 className="text-sm font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                   <BookOpen className="w-4 h-4 text-zinc-400" /> Top 5 Bibles Focus
                 </h3>
                 <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBibles} layout="vertical" margin={{ left: 0, right: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" stroke="#52525b" fontSize={12} hide />
                      <YAxis dataKey="id" type="category" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                      <Bar dataKey="requests" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* SCRAPER */}
        {activeTab === 'scraper' && (
          <div className="space-y-8 max-w-5xl animate-in fade-in duration-500">
            <header>
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Scraper Orchestration</h2>
              <p className="text-sm text-zinc-500 mt-1">Trigger GitHub Actions workflow directly from dashboard.</p>
            </header>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-xs tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Last Run</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  <ScraperTableRow title="Languages" tag="ENG, IND" triggerFn={triggerGithubAction} target="languages" />
                  <ScraperTableRow title="Bibles" tag="Max 3/lang" triggerFn={triggerGithubAction} target="bibles" />
                  <ScraperTableRow title="Books & Chapters" tag="With index generation" triggerFn={triggerGithubAction} target="books" />
                  <ScraperTableRow title="Verse of the Day" tag="Daily buffer" triggerFn={triggerGithubAction} target="votd" />
                  <ScraperTableRow title="Force Total Override" tag="Heaviest Task" triggerFn={triggerGithubAction} target="all" isPrimary />
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DATA CONTROL */}
        {activeTab === 'datacontrol' && (
           <div className="space-y-6 max-w-6xl animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Data Controller</h2>
                <p className="text-sm text-zinc-500 mt-1">Browse, invalidate, and manage Cloudflare R2 cache contents.</p>
              </div>
              <button onClick={bulkDeleteBible} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> BULK DELETE CACHE
              </button>
            </header>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Browser */}
              <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col relative min-h-[500px]">
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" value={r2Prefix} onChange={(e) => setR2Prefix(e.target.value)}
                      placeholder="Prefix filter (e.g. bibles/TB)" 
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 outline-none transition-colors"
                    />
                  </div>
                  <button onClick={fetchR2Files} className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-900 px-6 border border-emerald-500/20 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm">
                    Query Block
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto border border-zinc-800/50 rounded-lg bg-zinc-900/20">
                  {r2Files.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-zinc-600">Hit Query Block to query cache nodes</div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-zinc-900 text-zinc-500 text-xs border-b border-zinc-800 shadow-sm">
                        <tr>
                          <th className="px-4 py-3">R2 Path Key</th>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {r2Files.map(file => (
                          <tr key={file.key} className="hover:bg-zinc-800/30 group">
                            <td className="px-4 py-3 font-mono text-zinc-300 truncate max-w-[200px] cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => previewR2File(file.key)}>{file.key}</td>
                            <td className="px-4 py-3 text-zinc-500 text-xs">{Math.round(file.size/1024)} KB</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => previewR2File(file.key)} className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded"><FileJson className="w-4 h-4" /></button>
                                <button onClick={() => deleteR2File(file.key)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
