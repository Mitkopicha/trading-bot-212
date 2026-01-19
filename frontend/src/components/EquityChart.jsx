export default function EquityChart({ snapshots }) {
  if (!snapshots || snapshots.length < 2) {
    return <div>No equity history yet (take 2+ snapshots).</div>;
  }

  const values = snapshots.map(s => Number(s.total_equity));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 700;
  const height = 180;
  const pad = 10;

  const points = values.map((v, i) => {
    const x = pad + (i * (width - pad * 2)) / (values.length - 1);
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return `${x},${y}`;
  }).join(" ");

  const last = values[values.length - 1].toFixed(2);

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <strong>Total Equity (last):</strong> {last}
      </div>

      <svg width={width} height={height} style={{ border: "1px solid #ccc" }}>
        <polyline fill="none" stroke="black" strokeWidth="2" points={points} />
      </svg>

      <div style={{ fontSize: 12, marginTop: 6 }}>
        Min: {min.toFixed(2)} | Max: {max.toFixed(2)}
      </div>
    </div>
  );
}
