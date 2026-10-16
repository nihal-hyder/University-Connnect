"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Series = { key: string; label: string; color: "var(--chart-1)" | "var(--chart-2)" };

/**
 * Two count series over time on ONE shared axis (both are counts of people).
 * Recessive grid, 2px lines, crosshair tooltip, legend, and a table view so
 * identity never depends on colour alone.
 */
export function TrendChart({
  data,
  xKey,
  series,
  xFormat,
  title,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: Series[];
  xFormat: "day" | "week";
  title: string;
}) {
  const formatX = (v: string) => {
    const d = new Date(`${v.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return v;
    const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return xFormat === "week" ? `Week of ${label}` : label;
  };
  return (
    <figure className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
        </span>
      </figcaption>
      <div className="mt-4 h-64" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey={xKey} tickFormatter={formatX} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              labelFormatter={(v) => formatX(String(v))}
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" }}
              itemStyle={{ color: "var(--foreground)" }}
            />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Show as table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="py-1 pr-4 font-medium">Period</th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="py-1 pr-4 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={String(row[xKey])} className="border-t border-border">
                  <td className="py-1 pr-4">{formatX(String(row[xKey]))}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1 pr-4 text-right tabular-nums">
                      {row[s.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
