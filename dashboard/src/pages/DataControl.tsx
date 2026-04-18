import React, { useState, useEffect } from 'react';
import { Search, Trash2, RefreshCw, Eye } from 'lucide-react';

// URL Worker & App Key biasanya diambil dari env variables di Cloudflare Pages
// Fallback ke localhost untuk pengujian lokal
const WORKER_URL = import.meta.env.VITE_WORKER_URL;
const APP_KEY = import.meta.env.VITE_APP_KEY;

interface R2Object {
  key: string;
  size: number;
  uploaded: string;
}

export default function DataControl() {
  const [prefix, setPrefix] = useState('');
  const [files, setFiles] = useState<R2Object[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const fetchFiles = async (searchPrefix = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/admin/r2/list?prefix=${encodeURIComponent(searchPrefix)}`, {
        headers: { 'X-App-Key': APP_KEY }
      });
      const json = await res.json();
      setFiles(json.data || []);
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      alert('Gagal memuat data dari Worker API. Pastikan URL Worker dan API Key benar, dan CORS dikonfigurasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(prefix);
  };

  const toggleSelect = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Hapus ${selected.size} file secara permanen dari R2?`)) return;
    
    for (const key of Array.from(selected)) {
      try {
        await fetch(`${WORKER_URL}/admin/r2/delete?key=${encodeURIComponent(key)}`, {
          method: 'DELETE',
          headers: { 'X-App-Key': APP_KEY }
        });
      } catch(e) {
        console.error('Failed to delete', key);
      }
    }
    fetchFiles(prefix);
    setPreviewKey(null);
  };

  const handlePreview = async (key: string) => {
    try {
      setPreviewKey(key);
      setPreviewData('Loading...');
      const res = await fetch(`${WORKER_URL}/admin/r2/preview?key=${encodeURIComponent(key)}`, {
        headers: { 'X-App-Key': APP_KEY }
      });
      const data = await res.json();
      setPreviewData(JSON.stringify(data, null, 2));
    } catch(e) {
      setPreviewData('Error loading preview');
    }
  };

  const handleBulkDelete = async () => {
    const bibleId = prompt('Masukkan Bible ID untuk di-hapus (bulk delete) beserta seluruh Kitab dan Pasalnya:');
    if (!bibleId) return;
    
    if (!confirm(`⚠️ PERINGATAN BUKAN MAIN: Anda yakin ingin menghapus SEMUA file secara permanen untuk Bible ID ${bibleId}?`)) return;
    
    try {
      await fetch(`${WORKER_URL}/admin/r2/bulk-delete?bible_id=${encodeURIComponent(bibleId)}`, {
        method: 'DELETE',
        headers: { 'X-App-Key': APP_KEY }
      });
      alert(`Bulk delete untuk ID ${bibleId} telah diproses.`);
      fetchFiles(prefix);
      setPreviewKey(null);
    } catch(e) {
      console.error(e);
      alert('Gagal melakukan bulk delete');
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-80px)]">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Data Control</h2>
        <p className="text-muted-foreground mt-2">Browse, preview, invalidate, dan re-scrape data langsung dari Cloudflare R2.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={prefix}
              onChange={e => setPrefix(e.target.value)}
              placeholder="Cari berdasarkan Prefix (contoh: bibles/12/)"
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-secondary text-primary font-medium rounded-lg text-sm hover:bg-secondary/80 transition-colors">
            Cari
          </button>
        </form>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-4 py-2 bg-status-red/10 text-status-red font-medium rounded-lg text-sm hover:bg-status-red/20 transition-colors">
              <Trash2 className="w-4 h-4" />
              Hapus ({selected.size})
            </button>
          )}
          <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 border border-border font-medium rounded-lg text-sm hover:bg-surface-container-high text-foreground transition-colors">
            <Trash2 className="w-4 h-4" />
            Bulk Delete ID
          </button>
          <button onClick={() => fetchFiles(prefix)} className="flex items-center gap-2 px-4 py-2 border border-border font-medium rounded-lg text-sm hover:bg-surface-container-high text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 pb-6">
        {/* Main Table */}
        <div className="flex-1 rounded-xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-12 text-center border-r border-border">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(files.map(f => f.key)));
                        else setSelected(new Set());
                      }}
                      checked={files.length > 0 && selected.size === files.length}
                      className="rounded border-border bg-surface cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">S3 Key / Path</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Ukuran</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Waktu Upload</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Menghubungkan ke Worker API...</td></tr>
                ) : files.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Tidak ada data ditemukan di R2.</td></tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.key} className="hover:bg-surface-container-low/50 transition-colors group cursor-pointer" onClick={(e) => {
                      if((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'svg') {
                        toggleSelect(file.key);
                      }
                    }}>
                      <td className="px-4 py-3 text-center border-r border-border" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selected.has(file.key)}
                          onChange={() => toggleSelect(file.key)}
                          className="rounded border-border bg-surface cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-foreground/90 truncate max-w-xs" title={file.key}>{file.key}</td>
                      <td className="px-6 py-3 text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</td>
                      <td className="px-6 py-3 text-muted-foreground">{new Date(file.uploaded).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePreview(file.key); }} 
                          className="p-2 rounded-md bg-transparent hover:bg-secondary text-muted-foreground hover:text-primary transition-colors focus:outline-none" 
                          title="Preview JSON"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Preview Panel */}
        {previewKey && (
          <div className="w-96 rounded-xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col shrink-0">
            <div className="p-4 border-b border-border bg-surface-container-low flex items-center justify-between">
              <h3 className="font-semibold text-sm truncate pr-4 text-foreground" title={previewKey}>
                📄 {previewKey.split('/').pop()}
              </h3>
              <button onClick={() => setPreviewKey(null)} className="text-muted-foreground hover:text-foreground focus:outline-none">✕</button>
            </div>
            <div className="p-4 overflow-auto flex-1 bg-[#09090b] shadow-inner">
              <pre className="text-[11px] text-status-emerald font-mono whitespace-pre-wrap break-all leading-relaxed">
                {previewData}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
