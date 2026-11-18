import { useState, type ReactNode } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Every chart can flip to an accessible data table (PRD accessibility requirement). */
export function ChartFrame({ title, kicker, actions, chart, table, ariaLabel, className, height = 'h-72' }: { title: string; kicker?: string; actions?: ReactNode; chart: ReactNode; table: { headers: string[]; rows: (string | number)[][] }; ariaLabel: string; className?: string; height?: string }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn('rounded-2xl border border-card-border bg-card/80', className)}>
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-card-border/70 px-5 py-3.5">
        <div>
          {kicker && <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sport">{kicker}</p>}
          <h3 className="font-display text-lg font-bold uppercase tracking-wide">{title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button onClick={() => setAsTable((t) => !t)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground" aria-pressed={asTable} data-testid={`toggle-table-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {asTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
            {asTable ? 'Chart' : 'Table'}
          </button>
        </div>
      </header>
      <div className="p-4">
        {asTable ? (
          <div className={cn('scrollbar-thin overflow-auto', height)}>
            <table className="w-full text-sm">
              <caption className="sr-only">{ariaLabel}</caption>
              <thead className="sticky top-0 bg-card text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {table.headers.map((h) => (
                    <th key={h} scope="col" className="px-2 py-1.5 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    {r.map((c, j) => (
                      <td key={j} className={cn('px-2 py-1.5', j > 0 && 'tabular')}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={height} role="img" aria-label={ariaLabel}>
            {chart}
          </div>
        )}
      </div>
    </section>
  );
}
