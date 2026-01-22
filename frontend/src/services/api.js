const API_BASE = "/api";
async function httpJson(url, opts) {
  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    throw new Error("Network/CORS error: " + e.message);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

export async function getAccount(accountId) {
  return httpJson(`${API_BASE}/account?accountId=${accountId}`);
}
export async function getPortfolio(accountId) {
  return httpJson(`${API_BASE}/portfolio?accountId=${accountId}`);
}

export async function getTrades(accountId) {
  return httpJson(`${API_BASE}/trades?accountId=${accountId}`);
}

export async function runStep(accountId, symbol) {
  const res = await fetch(`${API_BASE}/trade/step?accountId=${accountId}&symbol=${symbol}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.text();
}




export async function runTrain(accountId, symbol, limit = 200, offset = 0) {
  const res = await fetch(`${API_BASE}/train?accountId=${accountId}&symbol=${symbol}&limit=${limit}&offset=${offset}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Training failed");
  return res.text();
}

export async function resetAccount(accountId) {
  const res = await fetch(`${API_BASE}/reset?accountId=${accountId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Reset failed");
  return res.text();
}

export async function trainStep(accountId, symbol, limit, index, offset = 0, candles = null) {
  let url = `${API_BASE}/train/step?accountId=${accountId}&symbol=${symbol}&limit=${limit}&index=${index}&offset=${offset}`;
  let options = { method: "POST" };
  if (candles && Array.isArray(candles) && candles.length > 0) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(candles);
  }
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    throw new Error("Network/CORS error: " + e.message);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}
export async function createEquitySnapshot(accountId, mode) {
  const res = await fetch(`${API_BASE}/equity/snapshot?accountId=${accountId}&mode=${mode}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Snapshot failed");
  return res.text();
}

export async function getEquitySnapshots(accountId, mode, limit = 200) {
  return httpJson(`${API_BASE}/equity/snapshots?accountId=${accountId}&mode=${mode}&limit=${limit}`);
}

export async function getCandles(symbol, limit = 100, interval = "1m", offset = 0) {
  return httpJson(`${API_BASE}/market/candles?symbol=${symbol}&limit=${limit}&interval=${interval}&offset=${offset}`);
}

export async function getAvailableSymbols() {
  return httpJson(`${API_BASE}/market/symbols`);
} 
export async function progressNow(accountId) {
  return httpJson(`${API_BASE}/progress/now?accountId=${accountId}`);
}     
export async function safeLimit(accountId, symbol) {
  return httpJson(`${API_BASE}/market/safe-limits?accountId=${accountId}&symbol=${symbol}`);
} 