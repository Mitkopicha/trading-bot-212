import React from "react";

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

export default function EquityChart({ snapshots }) {
  if (!snapshots || snapshots.length < 2) {
    return <div>No equity history yet (take 2+ snapshots).</div>;
  }

  const values = snapshots.map(s => Number(s.total_equity));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 700;
  const height = 200;
  const pad = 40;
  const svgPad = 12;

  const xFor = (i) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const yFor = (v) => pad + (height - pad * 2) * (1 - (v - min) / range);

  const points = values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");

  const first = values[0];
  const last = values[values.length - 1];
  const netChange = last - first;
  const netChangeColor = netChange >= 0 ? "#3ddc97" : "#ff6b6b";

  // X-axis time labels
  const step = Math.ceil(snapshots.length / 4);
  const timeLabels = [];
  for (let i = 0; i < snapshots.length; i += step) {
    const timeStr = formatTimeShort(snapshots[i].timestamp);
    const timePart = timeStr.split(", ").pop(); // Get "HH:MM" part
    timeLabels.push({ idx: i, label: timePart || `s-${snapshots.length - i}` });
  }

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
          const equity = min + range * pct;
          return (
            <text key={`label-${i}`} x="5" y={yVal + 4} fontSize="11" fill="var(--muted)">
              ${equity.toFixed(0)}
            </text>
          );
        })}

        {/* Equity line (thicker) */}
        <polyline fill="none" stroke="#3ddc97" strokeWidth="3" points={points} opacity="0.8" />

        {/* Start marker */}
        <circle cx={xFor(0)} cy={yFor(first)} r="4" fill="#3ddc97" opacity="0.6" />

        {/* End marker */}
        <circle cx={xFor(values.length - 1)} cy={yFor(last)} r="5" fill={netChangeColor} stroke="white" strokeWidth="1.5" />

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

      <div style={{ display: "flex", gap: "12px", fontSize: "12px", marginTop: "6px" }}>
        <div>
          <span style={{ color: "var(--muted)" }}>Start:</span> ${first.toFixed(2)}
        </div>
        <div>
          <span style={{ color: "var(--muted)" }}>Now:</span> ${last.toFixed(2)}
        </div>
        <div style={{ marginLeft: "auto", fontWeight: "800", color: netChangeColor }}>
          Net: {netChange >= 0 ? "+" : ""}${netChange.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
