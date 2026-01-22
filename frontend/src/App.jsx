import { useEffect, useRef, useState } from "react";
import {
  getAccount,
  getPortfolio,
  getTrades,
  runStep,
  resetAccount,
  trainStep,
  createEquitySnapshot,
  getEquitySnapshots,
  getCandles,
} from "./services/api";

import EquityChart from "./components/EquityChart";
import PriceChart from "./components/PriceChart";
import "./dashboard.css";

/* ======================================================================
   FORMAT HELPERS
====================================================================== */

function formatTs(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTsShort(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNum(n, decimals = 2) {
  if (n === null || n === undefined || n === "") return "-";
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x.toFixed(decimals);
}

/* ======================================================================
   SMALL UI COMPONENTS
====================================================================== */

function HoldingsMiniBar({ portfolio, latestPrice }) {
  const items = (portfolio || [])
    .map((p) => ({
      symbol: p.symbol,
      value: Number(p.quantity) * Number(latestPrice || 0),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  if (items.length === 0) {
    return (
      <div className="miniBarWrap">
        <div className="miniBarTitle">Holdings</div>
        <div className="miniBarEmpty">None</div>
      </div>
    );
  }

  const max = Math.max(...items.map((i) => i.value)) || 1;

  return (
    <div className="miniBarWrap">
      <div className="miniBarTitle">Holdings</div>
      <div className="miniBars">
        {items.slice(0, 3).map((it) => (
          <div key={it.symbol} className="miniBarRow">
            <div className="miniBarLabel">{it.symbol}</div>
            <div className="miniBarTrack">
              <div
                className="miniBarFill"
                style={{ width: `${(it.value / max) * 100}%` }}
                title={`${it.symbol}: $${it.value.toFixed(2)}`}
              />
            </div>
            <div className="miniBarValue">${it.value.toFixed(0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================================================================
   APP
====================================================================== */

export default function App() {
  /* ======================================================================
     MODE + CORE STATE
  ====================================================================== */

  const [mode, setMode] = useState("TRADING");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const accountId = mode === "TRADING" ? 1 : 2;

  const [account, setAccount] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [trades, setTrades] = useState([]);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  /* ======================================================================
     CONTROLS + CONSTANTS
  ====================================================================== */

  const [isRunning, setIsRunning] = useState(false);
  const intervalSec = 10;

  const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];
  const CANDLE_LIMIT = 100;
  const CANDLE_INTERVAL = "1m";

  const isActive = mode === "TRADING" ? isRunning : false;
  const [isTrainingRunning, setIsTrainingRunning] = useState(false);

 const primaryLabel =
  mode === "TRADING"
    ? isRunning
      ? "Pause"
      : "Start Trading"
    : isTrainingRunning
    ? "Pause"
    : "Start Training";

  /* ======================================================================
     TRAINING STATE
  ====================================================================== */

  const [trainLimit, setTrainLimit] = useState(200);
  const [trainIndex, setTrainIndex] = useState(21);
  const trainIndexRef = useRef(trainIndex);

  const [trainOffset, setTrainOffset] = useState(500);
  const [trainingCandles, setTrainingCandles] = useState([]);

  /* ======================================================================
     MARKET + SNAPSHOTS STATE
  ====================================================================== */

  const [snapshots, setSnapshots] = useState([]);
  const [liveCandles, setLiveCandles] = useState([]);
  const [baselineEquity, setBaselineEquity] = useState(null);
  const [lastPriceUpdateMs, setLastPriceUpdateMs] = useState(null);
  const [latestPrices, setLatestPrices] = useState({});

  useEffect(() => {
    trainIndexRef.current = trainIndex;
  }, [trainIndex]);

  /* ======================================================================
     DATA FETCHING
  ====================================================================== */

  // Fetch training candles ONCE per session/offset/limit/symbol
  useEffect(() => {
    if (mode === "TRAINING") {
      getCandles(symbol, trainLimit, CANDLE_INTERVAL, trainOffset).then(
        setTrainingCandles
      );
    } else {
      setTrainingCandles([]);
    }
  }, [mode, symbol, trainLimit, trainOffset]);

  // Poll live candles every 5s in TRADING mode
  useEffect(() => {
    let intervalId;

    async function fetchLive() {
      if (mode === "TRADING") {
        const data = await getCandles(symbol, CANDLE_LIMIT, CANDLE_INTERVAL);
        setLiveCandles(data);
      }
    }

    if (mode === "TRADING") {
      fetchLive();
      intervalId = setInterval(fetchLive, 5000);
    } else {
      setLiveCandles([]);
    }

    return () => intervalId && clearInterval(intervalId);
  }, [mode, symbol]);

  async function refresh() {
    setError("");
    const [a, p, t] = await Promise.all([
      getAccount(accountId),
      getPortfolio(accountId),
      getTrades(accountId),
    ]);
    setAccount(a);
    setPortfolio(p);
    setTrades(t);
  }

  async function loadSnapshots() {
    const data = await getEquitySnapshots(accountId, mode, 200);
    setSnapshots(data);
  }

  useEffect(() => {
    loadSnapshots().catch(() => {});
  }, [accountId, mode]);
useEffect(() => {
  setBaselineEquity(null);
}, [accountId, mode]);

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [accountId]);
useEffect(() => {
  if (baselineEquity != null) return;
  if (!snapshots || snapshots.length === 0) return;

  // Use the LAST item (oldest snapshot) as the baseline
  const oldestSnapshot = snapshots[snapshots.length - 1];
  const val = Number(oldestSnapshot.total_equity);

  if (Number.isFinite(val)) {
    setBaselineEquity(val);
  }
}, [snapshots, baselineEquity]);


  /* ======================================================================
     ACTIONS: STEP + RESET
  ====================================================================== */

  async function handleStep() {
    try {
      setStatus("Running step...");
      const result = await runStep(accountId, symbol);
      setStatus(result);

      await refresh();
      await createEquitySnapshot(accountId, mode);
      await loadSnapshots();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleReset() {
    try {
      const ok = window.confirm("Reset will clear portfolio & trades. Continue?");
      if (!ok) return;

      setStatus("Resetting...");
      setError("");

      await resetAccount(accountId);

      setTrades([]);
      setPortfolio([]);
      setSnapshots([]);

      setIsTrainingRunning(false);
      setTrainIndex(21);
      trainIndexRef.current = 21;
      setTrainingCandles([]);

      setAccount(null);

      await refresh();
      await createEquitySnapshot(accountId, mode);
      await loadSnapshots();

      setStatus("Reset: OK");
    } catch (e) {
      setError(e.message);
    }
  }

  /* ======================================================================
     AUTORUN: TRADING + TRAINING
  ====================================================================== */

  function startAuto() {
    setError("");
    setStatus("Auto running...");
    setIsRunning(true);
  }

  function pauseAuto() {
    setStatus("Paused");
    setIsRunning(false);
  }

  async function startTrainingAuto() {
    setError("");
    setStatus("");

    if (!trainingCandles || trainingCandles.length === 0) {
      try {
        setStatus("Loading training candles...");
        const data = await getCandles(
          symbol,
          trainLimit,
          CANDLE_INTERVAL,
          trainOffset
        );

        setTrainingCandles(data);

        if (!data || data.length === 0) {
          setError(
            "No candles returned from API. Check /api/market/candles in Network tab."
          );
          setStatus("");
          return;
        }
      } catch (e) {
        setError("Failed to load training candles: " + e.message);
        setStatus("");
        return;
      }
    }

    setStatus("Training running...");
    setIsTrainingRunning(true);
  }

  function pauseTrainingAuto() {
    setStatus("Training paused");
    setIsTrainingRunning(false);
  }

  function togglePrimary() {
    if (mode === "TRADING") {
      if (isRunning) pauseAuto();
      else startAuto();
    } else {
      if (isTrainingRunning) pauseTrainingAuto();
      else startTrainingAuto();
    }
  }

  // TRAINING AUTO LOOP
  useEffect(() => {
    if (mode !== "TRAINING") {
      setIsTrainingRunning(false);
      return;
    }
    if (!isTrainingRunning) return;

    const id = setInterval(async () => {
      try {
        const currentIndex = trainIndexRef.current;

        const candles = trainingCandles.map((c) => ({
          timestamp: c.timestamp,
          close: Number(c.close),
        }));

        const result = await trainStep(
          accountId,
          symbol,
          trainLimit,
          currentIndex,
          trainOffset,
          candles
        );

        setStatus(
          `Train: ${result.signal} | trades +${result.tradesExecuted} | next=${result.nextIndex}`
        );

        trainIndexRef.current = result.nextIndex;
        setTrainIndex(result.nextIndex);

        await refresh();
        await createEquitySnapshot(accountId, mode);
        await loadSnapshots();

        if (result.done) {
          setIsTrainingRunning(false);
          setStatus("Training finished");
        }
      } catch (e) {
        setIsTrainingRunning(false);
        setError(e.message);
      }
    }, 500);

    return () => clearInterval(id);
  }, [isTrainingRunning, mode, accountId, symbol, trainLimit, trainingCandles]);

  // TRADING AUTO LOOP
  useEffect(() => {
    if (mode !== "TRADING") {
      setIsRunning(false);
      return;
    }
    if (!isRunning) return;

    const id = setInterval(() => {
      handleStep();
    }, intervalSec * 1000);

    return () => clearInterval(id);
  }, [isRunning, intervalSec, mode]);

  /* ======================================================================
     CHART CANDLES SELECTION (LIVE vs TRAINING)
  ====================================================================== */

  const chartCandles =
    mode === "TRAINING"
      ? trainingCandles.slice(0, trainIndex + 1)
      : liveCandles;

  /* ======================================================================
     TIME NORMALIZATION
  ====================================================================== */

  function toMs(rawTs) {
    if (rawTs == null) return null;

    if (rawTs instanceof Date) return rawTs.getTime();

    if (typeof rawTs === "string") {
      const t = new Date(rawTs).getTime();
      return Number.isNaN(t) ? null : t;
    }

    const n = Number(rawTs);
    if (Number.isNaN(n)) return null;

    if (n > 0 && n < 1e12) return n * 1000;
    return n;
  }

  const MAX_TRADE_MARKERS = 30;

  const candleMinMs =
    chartCandles && chartCandles.length > 0
      ? toMs(chartCandles[0].timestamp ?? chartCandles[0].ts ?? chartCandles[0].time)
      : null;

  const candleMaxMs =
    chartCandles && chartCandles.length > 0
      ? toMs(
          chartCandles[chartCandles.length - 1].timestamp ??
            chartCandles[chartCandles.length - 1].ts ??
            chartCandles[chartCandles.length - 1].time
        )
      : null;

  const chartTrades = (trades || [])
    .filter((t) => {
      const tradeMs = toMs(t.timestamp);
      if (tradeMs == null) return false;

      if (candleMinMs == null || Number.isNaN(candleMinMs)) return true;
      if (candleMaxMs == null || Number.isNaN(candleMaxMs)) return tradeMs >= candleMinMs;

      return tradeMs >= candleMinMs && tradeMs <= candleMaxMs;
    })
    .slice(0, MAX_TRADE_MARKERS);

  /* ======================================================================
     LATEST PRICE + LAST UPDATE TIME
  ====================================================================== */

  const latestPrice =
    chartCandles && chartCandles.length > 0
      ? Number(chartCandles[chartCandles.length - 1].close)
      : 0;

  useEffect(() => {
    if (!chartCandles || chartCandles.length === 0) return;

    const last = chartCandles[chartCandles.length - 1];
    const rawTs = last?.timestamp ?? last?.ts ?? last?.time;
    const ms = rawTs ? toMs(rawTs) : null;

    if (ms && !Number.isNaN(ms)) setLastPriceUpdateMs(ms);
  }, [chartCandles, mode, symbol]);

  useEffect(() => {
    if (!symbol) return;

    const px = Number(latestPrice);
    if (!px || Number.isNaN(px)) return;

    setLatestPrices((prev) => ({ ...prev, [symbol]: px }));
  }, [symbol, latestPrice]);

  useEffect(() => {
    if (!portfolio || portfolio.length === 0) return;

    const symbolsToPrice = [...new Set(portfolio.map((p) => p.symbol))];
    let cancelled = false;

    async function fetchPrices() {
      try {
        const results = await Promise.all(
          symbolsToPrice.map(async (sym) => {
            const c = await getCandles(sym, 1, CANDLE_INTERVAL);
            const last = c?.[c.length - 1];
            const px = last ? Number(last.close) : null;
            return [sym, px];
          })
        );

        if (cancelled) return;

        setLatestPrices((prev) => {
          const next = { ...prev };
          for (const [sym, px] of results) {
            if (px && !Number.isNaN(px)) next[sym] = px;
          }
          return next;
        });
      } catch {
        // ignore
      }
    }

    fetchPrices();
    const id = setInterval(fetchPrices, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [portfolio]);

  /* ======================================================================
     PORTFOLIO VALUE (EQUITY)
  ====================================================================== */

  const cryptoValue = portfolio.reduce((sum, p) => {
    const px = latestPrices[p.symbol] ?? latestPrice;
    return sum + Number(p.quantity) * Number(px || 0);
  }, 0);

  const cash = account ? Number(account.cash_balance) : 0;
  const totalEquity = cash + cryptoValue;

  /* ======================================================================
     BASELINE + PnL (YOUR EXACT LOGIC)
  ====================================================================== */

const pnl = baselineEquity == null ? null : totalEquity - baselineEquity;
const realizedPnl = (trades || []).reduce((sum, t) => {
  if (t.side !== "SELL") return sum;
  const v = Number(t.pnl);
  return Number.isFinite(v) ? sum + v : sum;
}, 0);

const unrealizedPnl = pnl == null ? null : pnl - realizedPnl;

  // Optional debug (uncomment if you need it)
  // console.log("PNL stable", { startEquity, totalEquity, pnl });

  /* ======================================================================
     TRAINING UI RANGE + PROGRESS
  ====================================================================== */

  const showDatasetRange =
    mode === "TRAINING" &&
    trainingCandles.length > 1 &&
    (isTrainingRunning || trainIndex > 21);

  const backtestRange = showDatasetRange
    ? `Dataset: ${formatTs(trainingCandles[0].timestamp)} → ${formatTs(
        trainingCandles[trainingCandles.length - 1].timestamp
      )}`
    : null;

  const lastTradeTs = trades && trades.length > 0 ? trades[0].timestamp : null;

  const safeLimit = Math.max(1, Number(trainLimit || 1));

  const hasTrainingTrades = trades.some((t) => t.mode === "TRAINING");
  const trainingStarted =
    mode === "TRAINING" && (isTrainingRunning || hasTrainingTrades);

  const progressNow = trainingStarted
    ? Math.min(Number(trainIndex || 0), safeLimit)
    : 0;

  const progressPct = trainingStarted
    ? Math.min(100, Math.round((progressNow / safeLimit) * 100))
    : 0;

  /* ======================================================================
     TABLE HELPERS
  ====================================================================== */

  const totalHoldingsValue = portfolio.reduce((sum, p) => {
    const px = latestPrices[p.symbol];
    if (!px) return sum;
    return sum + Number(p.quantity) * Number(px);
  }, 0);

  /* ======================================================================
     RENDER
  ====================================================================== */

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Trading Bot Dashboard</h1>
      </div>

      {/* ========================= SUMMARY BAR ========================= */}
      <div className="summaryBar">
        <div className="summaryItem">
          <span className="label">Portfolio Value</span>
          <span className="value">${formatNum(totalEquity, 2)}</span>
        </div>

        <div className={`summaryItem ${pnl != null && pnl >= 0 ? "pos" : pnl != null ? "neg" : ""}`}>

          <span className="label">Total PnL</span>
          <span className="value">
  {pnl == null ? "—" : `${pnl >= 0 ? "+" : ""}$${formatNum(pnl, 2)}`}
</span>

        </div>

        <div className="summaryItem">
          <span className="label">Cash</span>
          <span className="value">${formatNum(cash, 2)}</span>
        </div>

        <HoldingsMiniBar portfolio={portfolio} latestPrice={latestPrice} />

        <div className="summaryRight">
          <div className="summaryMeta">
            <span className="label">Trades</span>
            <span className="valueSmall">{trades.length}</span>
          </div>
          <div className="summaryMeta">
            <span className="label">Last trade</span>
            <span className="valueSmall">
              {lastTradeTs ? formatTs(lastTradeTs) : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================= CONTROLS ========================= */}
      <div className="card controlsCard" style={{ marginBottom: 16 }}>
        <div className="controlsLayout">
          <div className="controlsLeft">
            <h2 className="controlsTitle">Controls</h2>

            <div className="modeTabs underTitle">
              <button
                className={`tab ${mode === "TRADING" ? "active" : ""}`}
                onClick={() => setMode("TRADING")}
              >
                Trading
              </button>
              <button
                className={`tab ${mode === "TRAINING" ? "active" : ""}`}
                onClick={() => setMode("TRAINING")}
              >
                Training
              </button>
            </div>
          </div>

          <div className="controlsRight">
            <div className="controlsActionsRow">
              <div className="controlsRowLeft">
                <label className="controlsSymbol">
                  <span className="controlsSymbolLabel">
                    Choose your cryptocurrency
                  </span>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                  >
                    {SYMBOLS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="controlsRowRight">
                <button className="primaryBtn" onClick={togglePrimary}>
                  {primaryLabel}
                </button>

                <button className="dangerBtn" onClick={handleReset}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================= MAIN GRID ========================= */}
      <div className="grid">
        <div className="stack">
          <div className="card">
            <div className="cardTopRow">
              <h2>Price Chart</h2>
            </div>
            <div className="chartHeader">
              <div>
                <div className="chartTitleRow">
                  <h1 className="chartSymbol" style={{ fontSize: "3rem" }}>
  {symbol}
</h1>
                </div>

                <div className="chartSub latestPrice">
                  Latest Price:{" "}
                  <span className="priceValue">{formatNum(latestPrice, 2)}</span>
                </div>

                <div className="lastUpdate">
                  Last update:{" "}
                  {lastPriceUpdateMs
                    ? new Date(lastPriceUpdateMs).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "—"}
                </div>
              </div>
            </div>

            <PriceChart candles={chartCandles} trades={chartTrades} />

            {mode === "TRAINING" && (
              <div className="backtestProgress">
                <div className="backtestTop">
                  <div className="backtestLabel">
                    <strong>Training replay</strong>
                    <span className="small">
                      Replay position: Candle <strong>{progressNow}</strong> of{" "}
                      {safeLimit}
                    </span>
                  </div>
                  <span className="backtestHint small">
                    Each step advances 1 candle
                  </span>
                </div>

                <div className="backtestTrack">
                  <div
                    className="backtestFill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="backtestControls">
                  <label className="small">
                    Training data size (candles):&nbsp;
                    <input
                      type="number"
                      min="50"
                      value={trainLimit}
                      onChange={(e) => setTrainLimit(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>
            )}

            {backtestRange && (
              <div
                className="backtestRangeLabel"
                style={{
                  marginTop: 4,
                  color: "var(--muted)",
                  fontSize: 12,
                }}
              >
                {backtestRange}
              </div>
            )}
          </div>

          <div className="card">
            <div className="cardTopRow">
              <h2>Portfolio Value</h2>
              <span className="cardMeta">{`Last ${snapshots.length} snapshots ~ Captured on each step`}</span>
            </div>

            <div className="equityMetaRow">
              <div className="equityMeta">
                <span className="small">Start</span>
                <strong>
                  $
                  {snapshots.length
                    ? formatNum(Number(snapshots[snapshots.length - 1].total_equity), 2)
                    : "—"}
                </strong>
              </div>
              <div className="equityMeta">
                <span className="small">Now</span>
                <strong>${formatNum(totalEquity, 2)}</strong>
              </div>
            </div>

            <EquityChart snapshots={snapshots} />
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h2>Portfolio</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Avg Entry</th>
                  <th>Value</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.length === 0 ? (
                  <tr>
                    <td colSpan="5">No holdings yet. Start trading to buy assets.</td>
                  </tr>
                ) : (
                  <>
                    {portfolio.map((row, idx) => {
                      const px = latestPrices[row.symbol];
                      const value =
                        px == null || Number.isNaN(Number(px))
                          ? null
                          : Number(row.quantity) * Number(px);

                      return (
                        <tr key={idx}>
                          <td>{row.symbol}</td>
                          <td>{formatNum(row.quantity, 8)}</td>
                          <td>{formatNum(row.avg_entry_price, 2)}</td>
                          <td>{value == null ? "—" : `$${formatNum(value, 2)}`}</td>
                          <td>{formatTs(row.updated_at)}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan="3">
                        <strong>Total</strong>
                      </td>
                      <td>
                        <strong>${formatNum(totalHoldingsValue, 2)}</strong>
                      </td>
                      <td />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Trade history</h2>

            <div className="tableScroll tradeHistoryScroll">
              <table className="table">
                <thead>
                  <tr>
                    <th className="colDate">Date</th>
                    <th>Action</th>
                    <th>Symbol</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>PNL</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan="6">No trades yet. Click “Start Trading” to begin!</td>
                    </tr>
                  ) : (
                    trades.map((row, idx) => {
                      const pnlNum =
                        row.pnl === null || row.pnl === undefined
                          ? null
                          : Number(row.pnl);

                      const pnlClass =
                        pnlNum === null || Number.isNaN(pnlNum)
                          ? "pnlMuted"
                          : pnlNum >= 0
                          ? "pnlPos"
                          : "pnlNeg";

                      return (
                        <tr key={idx}>
                          <td className="tdDate" title={row.timestamp}>
                            {formatTsShort(row.timestamp)}
                          </td>
                          <td>{row.side}</td>
                          <td>{row.symbol}</td>
                          <td>{formatNum(row.quantity, 8)}</td>
                          <td>{formatNum(row.price, 2)}</td>
                          <td className={pnlClass}>
                            {pnlNum === null || Number.isNaN(pnlNum)
                              ? "—"
                              : formatNum(pnlNum, 2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
