import type { Fmt } from './types';

export function fmt(v: number | undefined | null, f: Fmt): string {
  if (v == null || !Number.isFinite(v)) return '—';
  switch (f) {
    case 'int':
      return Math.round(v).toString();
    case 'd1':
      return v.toFixed(1);
    case 'd2':
      return v.toFixed(2);
    case 'pct':
      return `${(v * 100).toFixed(1)}%`;
    case 'avg':
      return v.toFixed(3).replace(/^0/, '');
    case 'ip': {
      const o = Math.round(v);
      return `${Math.floor(o / 3)}.${o % 3}`;
    }
    case 'signed':
      return `${v > 0 ? '+' : ''}${Number.isInteger(v) ? v : v.toFixed(1)}`;
  }
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', opts);
}

export const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const imgUrl = (name: string) => `${import.meta.env.BASE_URL}images/${name}`;
