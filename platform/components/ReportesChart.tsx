"use client";

import { useState } from "react";

const money = (n: number) => "$ " + n.toLocaleString("es-AR");

export default function ReportesChart({ serie }: { serie: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...serie.map((s) => s.value));
  const W = 760, H = 200, pad = 8;
  const n = serie.length;
  const bw = (W - pad * 2) / n;
  const total = serie.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rep-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="rep-svg">
        {serie.map((d, i) => {
          const h = d.value === 0 ? 1 : Math.max(2, (d.value / max) * (H - 28));
          const x = pad + i * bw;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x + bw * 0.12} y={H - h - 18} width={bw * 0.76} height={h}
                rx={Math.min(4, bw * 0.3)} fill={hover === i ? "#ff6a72" : "var(--red)"} opacity={d.value === 0 ? 0.25 : 1} />
              {(n <= 14 || i % Math.ceil(n / 14) === 0) && (
                <text x={x + bw / 2} y={H - 4} textAnchor="middle" className="rep-x">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="rep-foot">
        <span>{hover != null ? `${serie[hover].label}: ${money(serie[hover].value)}` : `Total período: ${money(total)}`}</span>
      </div>
    </div>
  );
}
