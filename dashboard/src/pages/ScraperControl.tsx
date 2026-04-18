export default function ScraperControl() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Scraper Control</h2>
        <p className="text-muted-foreground mt-2">Trigger and monitor GitHub Actions workflows.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium text-muted-foreground">Kategori</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Last Run</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-4 font-medium text-muted-foreground text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {['Languages', 'Bibles', 'Books & Chapters', 'VOTD'].map((item) => (
              <tr key={item} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="px-6 py-4 font-medium">{item}</td>
                <td className="px-6 py-4 text-muted-foreground">2 hours ago</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-status-emerald font-medium bg-status-emerald/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-emerald"></span> Success
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-on-primary transition-colors text-sm font-medium">
                    ▶ Trigger
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
