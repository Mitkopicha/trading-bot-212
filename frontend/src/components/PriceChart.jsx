import React from "react";

function nearestIndex(candles, tradeTimeMs) {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < candles.length; i++) {
    const diff = Math.abs(candles[i].time - tradeTimeMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

function formatTimeShort(timestamp) {
  if (!timestamp) return "";
  try {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function PriceChart({ candles, trades }) {
  if (!candles || candles.length < 2) return <div>No candle data yet.</div>;

  const width = 700;
  const height = 220;
  const pad = 40;
  const svgPad = 12;

  const prices = candles.map(c => Number(c.close));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const xFor = (i) => pad + (i * (width - pad * 2)) / (candles.length - 1);
  const yFor = (p) => pad + (height - pad * 2) * (1 - (p - min) / range);

  const points = prices.map((p, i) => `${xFor(i)},${yFor(p)}`).join(" ");

  // X-axis time labels (every ~20% of data)
  const step = Math.ceil(candles.length / 5);
  const timeLabels = [];
  for (let i = 0; i < candles.length; i += step) {
    const timeStr = formatTimeShort(candles[i].time);
    const timePart = timeStr.split(", ").pop(); // Get "HH:MM" part
    timeLabels.push({ idx: i, label: timePart || `t-${candles.length - i}` });
  }

  const markers = (trades || [])
    .filter(t => t.symbol && t.timestamp)
    .map(t => {
      const tradeTimeMs = Date.parse(t.timestamp);
      const idx = nearestIndex(candles, tradeTimeMs);
      const p = prices[idx];
      return {
        side: t.side,
        x: xFor(idx),
        y: yFor(p),
        timestamp: t.timestamp,
        price: prices[idx],
        quantity: t.quantity,
      };
    });

  const [hoveredIdx, setHoveredIdx] = React.useState(null);
  const hovered = hoveredIdx !== null ? markers[hoveredIdx] : null;

  const last = prices[prices.length - 1].toFixed(2);

  return (
    <div>
      <svg width={width + svgPad * 2} height={height + svgPad * 2} style={{ border: "1px solid var(--border)", background: "#0f131b", marginBottom: 8 }}>
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const yVal = pad + (height - pad * 2) * (1 - pct);
          return (
            <line key={`grid-${i}`} x1={pad - 5} y1={yVal} x2={width - pad} y2={yVal} stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((pct, i) => {
          const yVal = pad + (height - pad * 2) * (1 - pct);
          const price = min + range * pct;
          return (
            <text key={`label-${i}`} x="5" y={yVal + 4} fontSize="11" fill="var(--muted)">
              {price.toFixed(0)}
            </text>
          );
        })}

        {/* Price line */}
        <polyline fill="none" stroke="#3ddc97" strokeWidth="2.5" points={points} />

        {/* Trade markers with interaction */}
        {markers.map((m, i) => (
          <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
            <circle cx={m.x} cy={m.y} r="5" fill={m.side === "BUY" ? "#3ddc97" : "#ff6b6b"} stroke="white" strokeWidth="1.5" style={{ cursor: "pointer" }} />
            {hoveredIdx === i && (
              <g>
                <rect x={Math.max(pad, m.x - 95)} y={m.y - 85} width="190" height="100" fill="#0d1117" stroke="#3ddc97" strokeWidth="2" rx="4" opacity="0.95" />
                <text x={Math.max(pad + 8, m.x - 87)} y={m.y - 60} fontSize="12" fontWeight="800" fill={m.side === "BUY" ? "#3ddc97" : "#ff6b6b"}>
                  {m.side}
                </text>
                <text x={Math.max(pad + 8, m.x - 87)} y={m.y - 40} fontSize="11" fill="#888">
                  {formatTimeShort(m.timestamp)}
                </text>
                <text x={Math.max(pad + 8, m.x - 87)} y={m.y - 20} fontSize="11" fill="#fff">
                  ${m.price.toFixed(2)}
                </text>
                <text x={Math.max(pad + 8, m.x - 87)} y={m.y} fontSize="11" fill="#888">
                  Qty: {Number(m.quantity).toFixed(6)}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* X-axis time labels */}
        {timeLabels.map((tl, i) => {
          const x = xFor(tl.idx);
          return (
            <text key={`time-${i}`} x={x} y={height - 5} fontSize="11" fill="var(--muted)" textAnchor="middle">
              {tl.label}
            </text>
          );
        })}

        {/* X-axis baseline */}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--border)" strokeWidth="1" />
      </svg>

      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        Min: {min.toFixed(2)} | Max: {max.toFixed(2)} | Hover markers for details
      </div>
    </div>
  );
}

