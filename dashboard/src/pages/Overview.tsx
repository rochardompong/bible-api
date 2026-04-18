export default function Overview() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Overview</h2>
        <p className="text-muted-foreground mt-2">System health at a glance.</p>
      </div>
      
      {/* 6 Metric Cards Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-border bg-surface shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">System Status</div>
          <div className="mt-2 text-2xl font-bold text-status-emerald">UP</div>
        </div>
        <div className="p-6 rounded-xl border border-border bg-surface shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">Cache Hit Rate</div>
          <div className="mt-2 text-2xl font-bold text-foreground">85%</div>
        </div>
        <div className="p-6 rounded-xl border border-border bg-surface shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">Error Rate</div>
          <div className="mt-2 text-2xl font-bold text-status-emerald">0.5%</div>
        </div>
        <div className="p-6 rounded-xl border border-border bg-surface shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">Quota Usage</div>
          <div className="mt-2 text-2xl font-bold text-foreground">150<span className="text-sm text-muted-foreground font-normal">/1000</span></div>
        </div>
        <div className="p-6 rounded-xl border border-border bg-surface shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">Request Volume</div>
          <div className="mt-2 text-2xl font-bold text-status-blue">1,245</div>
        </div>
        <div className="p-6 rounded-xl border border-border bg-surface shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">Last Scraper Run</div>
          <div className="mt-2 text-lg font-bold text-status-emerald flex items-center gap-2">
            2 hours ago <span className="text-xs px-2 py-1 rounded-full bg-status-emerald/10 text-status-emerald font-medium">Success</span>
          </div>
        </div>
      </div>
    </div>
  );
}
