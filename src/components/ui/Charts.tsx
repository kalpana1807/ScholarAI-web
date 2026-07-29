import { useMemo } from 'react';
import { cn } from '../../lib/utils';

// Lightweight SVG-based charts (no external deps).

export function BarChart({
  data,
  height = 180,
  color = '#3b66ff',
  valueFormat = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  valueFormat?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-semibold text-ink-400">{valueFormat(d.value)}</span>
            <div
              className="w-full rounded-t-lg transition-all duration-700"
              style={{
                height: `${(d.value / max) * (height - 28)}px`,
                background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                minHeight: 4,
              }}
            />
            <span className="truncate text-[10px] font-medium text-ink-500">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  size = 160,
  thickness = 22,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const center = size / 2;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={thickness} className="stroke-ink-100 dark:stroke-ink-800" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * circ;
            const seg = (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            );
            offset += len;
            return seg;
          })}
        {total === 0 && (
          <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={thickness} className="stroke-ink-100 dark:stroke-ink-800" />
        )}
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="text-ink-600 dark:text-ink-300">{d.label}</span>
            <span className="font-semibold text-ink-900 dark:text-ink-100">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  height = 180,
  color = '#3b66ff',
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const width = 320;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const pad = 24;
  const stepX = (width - pad * 2) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: pad + i * stepX,
    y: pad + (1 - (d.value - min) / range) * (height - pad * 2),
  }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const area = `${path} L ${points[points.length - 1]?.x ?? pad},${height - pad} L ${pad},${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={pad} y1={pad + t * (height - pad * 2)} x2={width - pad} y2={pad + t * (height - pad * 2)} className="stroke-ink-100 dark:stroke-ink-800" strokeDasharray="3 3" />
      ))}
      <path d={area} fill="url(#lineFill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={pad + i * stepX} y={height - 6} textAnchor="middle" className="fill-ink-500 text-[9px]">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

export function StatRing({
  value,
  max,
  size = 100,
  thickness = 10,
  color = '#3b66ff',
  label,
}: {
  value: number;
  max: number;
  size?: number;
  thickness?: number;
  color?: string;
  label?: string;
}) {
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={thickness} className="stroke-ink-100 dark:stroke-ink-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-display text-base font-bold text-ink-900 dark:text-ink-50')}>{Math.round(pct * 100)}%</span>
        {label && <span className="text-[10px] text-ink-400">{label}</span>}
      </div>
    </div>
  );
}
