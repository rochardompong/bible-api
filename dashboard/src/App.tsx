import { useState, useEffect } from 'react'
import { Activity, Play, Settings, Server, RefreshCw, Clock, CheckCircle2, AlertCircle, Database, Trash2, Search, FileJson, BarChart3, LineChart as LineChartIcon, ShieldCheck, AlertTriangle, XCircle, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Mock Data
const volumeData = [
  { name: 'Mon', reqs: 4000 }, { name: 'Tue', reqs: 3000 }, { name: 'Wed', reqs: 5000 },
  { name: 'Thu', reqs: 7000 }, { name: 'Fri', reqs: 6000 }, { name: 'Sat', reqs: 9000 }, { name: 'Sun', reqs: 11000 }
];

const topBibles = [
  { id: 'TB', requests: 45000 }, { id: 'NIV', requests: 38000 }, { id: 'KJV', requests: 25000 },
  { id: 'ESV', requests: 12000 }, { id: 'BIMK', requests: 8000 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  
  // Settings State
  const [ghRepo, setGhRepo] = useState(localStorage.getItem('ghRepo') || 'owner/repo')
  const [ghToken, setGhToken] = useState(localStorage.getItem('ghToken') || '')
  const [workerUrl, setWorkerUrl] = useState(localStorage.getItem('workerUrl') || 'http://127.0.0.1:8787')
  const [workerAppKey, setWorkerAppKey] = useState(localStorage.getItem('workerAppKey') || '')
  
  // Data Control State
  const [r2Files, setR2Files] = useState<any[]>([])
  const [r2Prefix, setR2Prefix] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)
  
  // Analytics State
  const [analyticsTab, setAnalyticsTab] = useState('usage')

  useEffect(() => {
    localStorage.setItem('ghRepo', ghRepo)
    localStorage.setItem('ghToken', ghToken)
    localStorage.setItem('workerUrl', workerUrl)
    localStorage.setItem('workerAppKey', workerAppKey)
  }, [ghRepo, ghToken, workerUrl, workerAppKey])

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
    <div className="min-h-screen bg-zinc-950 text-zinc-300 flex flex-col md:flex-row font-sans selection:bg-zinc-800">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900/50 border-r border-zinc-800/80 md:h-screen sticky top-0 px-5 py-8 flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2 block">Admin Console</span>
          <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            Hybrid Bible
          </h1>
        </div>

        <nav className="flex flex-col gap-1.5 flex-grow">
          {SidebarItem('overview', 'Overview', Activity, activeTab, setActiveTab)}
          {SidebarItem('scraper', 'Scraper', RefreshCw, activeTab, setActiveTab)}
          {SidebarItem('datacontrol', 'Data Control', Database, activeTab, setActiveTab, () => { fetchR2Files() })}
          {SidebarItem('analytics', 'Analytics', BarChart3, activeTab, setActiveTab)}
          {SidebarItem('settings', 'Settings', Settings, activeTab, setActiveTab)}
        </nav>

        <div className="mt-auto flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        
        {/* OVERVIEW PHASE 1 */}
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
              <MetricCard title="Last Scraper Run" value="SUCCESS" color="emerald" desc="12 mins ago" />
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
                 <h3 className="text-sm font-semibold text-zinc-100 mb-6">Top 5 Bibles</h3>
                 <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBibles} layout="vertical" margin={{ left: 0, right: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" stroke="#52525b" fontSize={12} hide />
                      <YAxis dataKey="id" type="category" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                      <Bar dataKey="requests" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* SCRAPER CONTROL */}
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
                  <ScraperTableRow title="Full Scrape Sequence" tag="Heavy" triggerFn={triggerGithubAction} target="all" isPrimary />
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DATA CONTROL PHASE 2 */}
        {activeTab === 'datacontrol' && (
          <div className="space-y-6 max-w-6xl animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">R2 Data Control</h2>
                <p className="text-sm text-zinc-500 mt-1">Browse, invalidate, and manage Cloudflare R2 cache contents.</p>
              </div>
              <button onClick={bulkDeleteBible} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> BULK DELETE PER BIBLE ID
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
                      placeholder="Filter path prefix (e.g. bibles/TB)" 
                      className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-500 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 outline-none transition-colors"
                    />
                  </div>
                  <button onClick={fetchR2Files} className="bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                    Browse
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto border border-zinc-800/50 rounded-lg bg-zinc-900/20">
                  {r2Files.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-zinc-600">Hit Browse to list files</div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-zinc-900 text-zinc-500 text-xs border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-2">Path</th>
                          <th className="px-4 py-2">Size</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {r2Files.map(file => (
                          <tr key={file.key} className="hover:bg-zinc-800/30 group">
                            <td className="px-4 py-3 font-medium text-zinc-300 truncate max-w-[200px] cursor-pointer" onClick={() => previewR2File(file.key)}>{file.key}</td>
                            <td className="px-4 py-3 text-zinc-500 text-xs">{Math.round(file.size/1024)} KB</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => previewR2File(file.key)} className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded"><FileJson className="w-4 h-4" /></button>
                                <button onClick={() => deleteR2File(file.key)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Preview JSON */}
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col max-h-[600px]">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 rounded-t-2xl">
                  <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2"><FileJson className="w-4 h-4 text-emerald-500" /> Read-Only Preview</h3>
                  {previewData && <button onClick={() => setPreviewData(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Clear</button>}
                </div>
                <div className="flex-1 p-4 overflow-auto bg-[#0d0d0f] rounded-b-2xl">
                  {previewData ? (
                    <pre className="text-[11px] font-mono text-emerald-400/90 whitespace-pre-wrap">{previewData}</pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">Select a file to view raw JSON</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS PHASE 3 */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 max-w-6xl animate-in fade-in duration-500">
             <header className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Advanced Analytics</h2>
              <p className="text-sm text-zinc-500 mt-1">Worker aggregated metrics for Usage, Search, and Offline Downloads.</p>
            </header>

            <div className="flex gap-2 border-b border-zinc-800 pb-px mb-6">
              <AnalyticsTab title="Usage" active={analyticsTab === 'usage'} onClick={() => setAnalyticsTab('usage')} />
              <AnalyticsTab title="Search" active={analyticsTab === 'search'} onClick={() => setAnalyticsTab('search')} />
              <AnalyticsTab title="Download" active={analyticsTab === 'download'} onClick={() => setAnalyticsTab('download')} />
            </div>

            {analyticsTab === 'usage' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold mb-4 text-zinc-300">Request Volume Trend (30 Days)</h3>
                  <div className="h-64 flex items-center justify-center bg-zinc-900/20 rounded-xl border border-zinc-800/50"><span className="text-zinc-600 text-sm">Line Chart Placeholder</span></div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold mb-4 text-zinc-300">Top 10 Bibles Accessed</h3>
                  <div className="h-64 flex items-center justify-center bg-zinc-900/20 rounded-xl border border-zinc-800/50"><span className="text-zinc-600 text-sm">Bar Chart Placeholder</span></div>
                </div>
              </div>
            )}

            {analyticsTab === 'search' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-0 overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900/60"><h3 className="text-sm font-semibold text-zinc-300">Top Search Queries</h3></div>
                  <table className="w-full text-sm text-left"><thead className="bg-zinc-800/30 text-zinc-500 text-xs"><tr><th className="px-4 py-2">Query</th><th className="px-4 py-2 text-right">Volume</th></tr></thead><tbody className="divide-y divide-zinc-800/50"><tr><td className="px-4 py-3 text-zinc-300">kasih</td><td className="px-4 py-3 text-right text-zinc-500">14.2k</td></tr><tr><td className="px-4 py-3 text-zinc-300">daud</td><td className="px-4 py-3 text-right text-zinc-500">8.1k</td></tr></tbody></table>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-0 overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900/60"><h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">Zero-Result Queries <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">Attention</span></h3></div>
                  <table className="w-full text-sm text-left"><thead className="bg-zinc-800/30 text-zinc-500 text-xs"><tr><th className="px-4 py-2">Query</th><th className="px-4 py-2 text-right">Volume</th></tr></thead><tbody className="divide-y divide-zinc-800/50"><tr><td className="px-4 py-3 text-zinc-300">mazmur 189</td><td className="px-4 py-3 text-right text-red-400/80">420</td></tr></tbody></table>
                </div>
              </div>
            )}

            {analyticsTab === 'download' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold mb-4 text-zinc-300">Top Downloaded Bibles</h3>
                  <div className="h-64 flex items-center justify-center bg-zinc-900/20 rounded-xl border border-zinc-800/50"><span className="text-zinc-600 text-sm">Bar Chart Placeholder</span></div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-0 overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900/60"><h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">Download Completion Rate</h3></div>
                  <table className="w-full text-sm text-left"><thead className="bg-zinc-800/30 text-zinc-500 text-xs"><tr><th className="px-4 py-2">Bible</th><th className="px-4 py-2">Started</th><th className="px-4 py-2">Completed</th><th className="px-4 py-2 text-right">Rate %</th></tr></thead><tbody className="divide-y divide-zinc-800/50"><tr><td className="px-4 py-3 text-zinc-300 font-medium">TB</td><td className="px-4 py-3 text-zinc-400">12,000</td><td className="px-4 py-3 text-zinc-400">11,800</td><td className="px-4 py-3 text-right text-emerald-400">98.3%</td></tr><tr><td className="px-4 py-3 text-zinc-300 font-medium">KJV</td><td className="px-4 py-3 text-zinc-400">4,500</td><td className="px-4 py-3 text-zinc-400">3,100</td><td className="px-4 py-3 text-right text-amber-400">68.8%</td></tr></tbody></table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl animate-in fade-in duration-500">
            <header className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">System Configuration</h2>
              <p className="text-sm text-zinc-500 mt-1">Tokens and keys are strictly saved in local browser storage.</p>
            </header>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-5 border-b border-zinc-800 pb-2">GitHub App Context</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold tracking-widest uppercase text-zinc-500 mb-1 block">Repo Target (owner/repo)</label>
                  <input type="text" value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-4 py-2.5 text-sm text-zinc-200 outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-bold tracking-widest uppercase text-zinc-500 mb-1 block">PAT Token (Actions Scope)</label>
                  <input type="password" value={ghToken} onChange={(e) => setGhToken(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-4 py-2.5 text-sm text-zinc-200 outline-none transition-colors" />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-5 border-b border-zinc-800 pb-2">Worker API Context</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold tracking-widest uppercase text-zinc-500 mb-1 block">Public URL</label>
                  <input type="text" value={workerUrl} onChange={(e) => setWorkerUrl(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-4 py-2.5 text-sm text-zinc-200 outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-bold tracking-widest uppercase text-zinc-500 mb-1 block">X-App-Key</label>
                  <input type="password" value={workerAppKey} onChange={(e) => setWorkerAppKey(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg px-4 py-2.5 text-sm text-zinc-200 outline-none transition-colors" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function SidebarItem(id: string, label: string, Icon: any, activeId: string, setActive: any, onClick?: () => void) {
  const active = id === activeId
  return (
    <button onClick={() => { setActive(id); onClick && onClick() }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left ${active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>
      <Icon className={`w-4 h-4 ${active ? 'text-zinc-100' : ''}`} />
      {label}
    </button>
  )
}

function AnalyticsTab({ title, active, onClick }: { title: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-emerald-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
      {title}
    </button>
  )
}

function MetricCard({ title, value, color, icon: Icon, desc }: any) {
  const c = { emerald: 'text-emerald-500', amber: 'text-amber-500', red: 'text-red-500' }[color as string] || 'text-zinc-300'
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between min-h-[120px]">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{title}</span>
        {Icon && <Icon className={`w-4 h-4 ${c}`} />}
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${c}`}>{value}</div>
        {desc && <p className="text-xs text-zinc-500 mt-1">{desc}</p>}
      </div>
    </div>
  )
}

function ScraperTableRow({ title, tag, isPrimary, triggerFn, target }: any) {
  const [status, setStatus] = useState('idle')

  return (
    <tr className="hover:bg-zinc-800/30 transition-colors">
      <td className="px-6 py-4">
        <div className="font-medium text-zinc-200">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{tag}</div>
      </td>
      <td className="px-6 py-4 text-sm">
        {status === 'idle' && <span className="text-zinc-500">—</span>}
        {status === 'running' && <span className="text-amber-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running</span>}
        {status === 'success' && <span className="text-emerald-500 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Success</span>}
        {status === 'error' && <span className="text-red-500 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Failed</span>}
      </td>
      <td className="px-6 py-4 text-xs text-zinc-500">
        {status === 'idle' ? 'Yesterday' : status === 'running' ? 'Right now' : 'Just now'}
      </td>
      <td className="px-6 py-4 text-right">
        <button onClick={() => triggerFn(target, setStatus)} disabled={status === 'running'} className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${isPrimary ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50'}`}>
           RUN
        </button>
      </td>
    </tr>
  )
}
