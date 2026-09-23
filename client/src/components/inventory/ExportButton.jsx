import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { api } from '../../api/client.js';

export function ExportButton({ filters }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.downloadExcel({
        engine: filters.engine,
        project: filters.project,
        region: filters.region,
        state: filters.state,
        environment: filters.environment,
        search: filters.search,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2 bg-accent-muted border border-accent/30 text-accent text-sm font-medium rounded-lg hover:bg-accent/20 disabled:opacity-50 transition-colors"
    >
      {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      Exportar Excel
    </button>
  );
}
