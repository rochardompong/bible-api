export default function DataControl() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Data Control</h2>
        <p className="text-muted-foreground mt-2">Browse, invalidate, and re-scrape data R2.</p>
      </div>

      <div className="p-8 rounded-xl border border-border border-dashed bg-surface flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground mb-4">Worker API Integration Required</p>
        <button className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 font-medium">
          Connect to Cloudflare R2
        </button>
      </div>
    </div>
  );
}
