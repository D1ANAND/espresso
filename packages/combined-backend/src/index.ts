import './env'; // MUST be first — loads .env before any module reads process.env
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import { app as bitcoinApiApp } from '@bmcp/bitcoin-api';
import { app as espEscrowApp } from '@bmcp/esp-escrow';

const app = express();

app.use(cors());
app.use(express.json());

// ── ESP Request Log (in-memory, last 100 entries) ──────────────────────
type EspLogEntry = {
  id: number;
  timestamp: string;
  ip: string;
  status: 'success' | 'error' | 'pending';
  statusCode: number;
  destination_chain: string | null;
  receiver: string | null;
  function_signature: string | null;
  function_args: unknown[] | null;
  responseMessage: string | null;
  durationMs: number;
  // Extended fields for detailed view
  txHash: string | null;
  bmcpData: string | null;
  escrowAddress: string | null;
  totalInput: number | null;
  fee: number | null;
  feeRate: number | null;
  changeAmount: number | null;
  opReturnSize: number | null;
  txSize: number | null;
  mempoolLink: string | null;
  errorDetail: string | null;
};

const espLogs: EspLogEntry[] = [];
let logIdCounter = 0;
const MAX_LOG_ENTRIES = 100;

// Middleware to intercept and log ESP intent requests
app.use('/escrow/esp-intent', (req: Request, _res: Response, next: NextFunction) => {
  if (req.method !== 'POST') return next();

  const startTime = Date.now();
  const entry: EspLogEntry = {
    id: ++logIdCounter,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    status: 'pending',
    statusCode: 0,
    destination_chain: req.body?.destination_chain ?? null,
    receiver: req.body?.receiver ?? null,
    function_signature: req.body?.function_signature ?? null,
    function_args: req.body?.function_args ?? null,
    responseMessage: null,
    durationMs: 0,
    txHash: null,
    bmcpData: null,
    escrowAddress: null,
    totalInput: null,
    fee: null,
    feeRate: null,
    changeAmount: null,
    opReturnSize: null,
    txSize: null,
    mempoolLink: null,
    errorDetail: null,
  };

  // ── Terminal log: request arrived ──
  console.log(
    `\n📡 [ESP #${entry.id}] Incoming request from ${entry.ip}` +
    `\n   Chain: ${entry.destination_chain ?? '—'}  |  Receiver: ${entry.receiver ?? '—'}` +
    `\n   Function: ${entry.function_signature ?? '—'}` +
    `\n   Args: ${JSON.stringify(entry.function_args)}`
  );

  espLogs.unshift(entry); // newest first
  if (espLogs.length > MAX_LOG_ENTRIES) espLogs.pop();

  // Capture the response
  const origJson = _res.json.bind(_res);
  _res.json = function (body: any) {
    entry.durationMs = Date.now() - startTime;
    entry.statusCode = _res.statusCode;
    entry.status = _res.statusCode >= 200 && _res.statusCode < 300 ? 'success' : 'error';

    // Extract detailed data from esp-escrow response
    if (body?.status === 'error') {
      entry.responseMessage = body.message;
      entry.errorDetail = body.message;
    } else {
      entry.txHash = body?.bitcoinApi?.broadcast?.txHash ?? null;
      entry.bmcpData = body?.bmcpData ?? null;
      entry.escrowAddress = body?.bitcoinApi?.psbt?.address ?? null;
      entry.totalInput = body?.bitcoinApi?.psbt?.totalInput ?? null;
      entry.fee = body?.bitcoinApi?.psbt?.fee ?? null;
      entry.feeRate = body?.bitcoinApi?.psbt?.feeRate ?? null;
      entry.changeAmount = body?.bitcoinApi?.psbt?.changeAmount ?? null;
      entry.opReturnSize = body?.bitcoinApi?.psbt?.opReturnSize ?? null;
      entry.txSize = body?.bitcoinApi?.psbt?.txSize ?? null;
      entry.mempoolLink = body?.bitcoinApi?.broadcast?.link ?? null;
      entry.responseMessage = entry.txHash
        ? `TX: ${entry.txHash}`
        : body?.status ?? 'ok';
    }

    // ── Terminal log: request completed ──
    const icon = entry.status === 'success' ? '✅' : '❌';
    console.log(
      `${icon} [ESP #${entry.id}] ${entry.status.toUpperCase()} (${entry.statusCode}) in ${entry.durationMs}ms` +
      `\n   Response: ${entry.responseMessage ?? '—'}`
    );
    return origJson(body);
  };

  const origSend = _res.send.bind(_res);
  _res.send = function (body: any) {
    if (entry.status === 'pending') {
      entry.durationMs = Date.now() - startTime;
      entry.statusCode = _res.statusCode;
      entry.status = _res.statusCode >= 200 && _res.statusCode < 300 ? 'success' : 'error';
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        entry.responseMessage = parsed?.message ?? parsed?.status ?? null;
        entry.errorDetail = parsed?.message ?? null;
      } catch {
        entry.responseMessage = typeof body === 'string' ? body.slice(0, 120) : null;
      }
      // ── Terminal log: request completed (send path) ──
      const icon = entry.status === 'success' ? '✅' : '❌';
      console.log(
        `${icon} [ESP #${entry.id}] ${entry.status.toUpperCase()} (${entry.statusCode}) in ${entry.durationMs}ms` +
        `\n   Response: ${entry.responseMessage ?? '—'}`
      );
    }
    return origSend(body);
  } as any;

  next();
});

// API endpoint to fetch ESP logs
app.get('/api/esp-logs', (_req: Request, res: Response) => {
  res.json({ logs: espLogs, total: espLogs.length });
});

// ── Frontend Dashboard ─────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title> Espresso </title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background: #050a18;
        color: #e2e8f0;
        min-height: 100vh;
      }

      body::before {
        content: '';
        position: fixed; inset: 0; z-index: -1;
        background:
          radial-gradient(ellipse 80% 50% at 20% 40%, rgba(56,189,248,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 60% 40% at 80% 60%, rgba(139,92,246,0.06) 0%, transparent 70%),
          #050a18;
      }

      .container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }

      /* Header */
      .header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.75rem; }
      .header-dot {
        width: 10px; height: 10px; border-radius: 50%;
        background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5);
        animation: pulse-dot 2s infinite;
      }
      @keyframes pulse-dot {
        0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.5); }
        50% { box-shadow: 0 0 16px rgba(34,197,94,0.8); }
      }
      h1 { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; }
      h1 span { background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

      .subtitle { font-size: 0.78rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.5; }
      .subtitle code {
        background: rgba(30,41,59,0.7); padding: 0.12rem 0.4rem; border-radius: 4px;
        border: 1px solid #1e293b; font-size: 0.72rem; color: #94a3b8;
      }

      /* Health grid */
      .health-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem; margin-bottom: 2rem;
      }
      .health-card {
        background: rgba(15,23,42,0.6); border: 1px solid #1e293b;
        border-radius: 0.75rem; padding: 1rem 1.15rem;
        backdrop-filter: blur(8px);
        transition: border-color 0.3s, box-shadow 0.3s;
      }
      .health-card:hover { border-color: #334155; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
      .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; }
      .card-title { font-weight: 600; font-size: 0.82rem; color: #cbd5e1; }

      .badge {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 0.68rem; font-weight: 600; padding: 0.2rem 0.55rem;
        border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.04em;
      }
      .badge-ok { background: rgba(34,197,94,0.12); color: #4ade80; }
      .badge-err { background: rgba(239,68,68,0.12); color: #f87171; }
      .badge-pending { background: rgba(250,204,21,0.12); color: #facc15; }
      .badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
      .badge-ok::before { background: #4ade80; }
      .badge-err::before { background: #f87171; }
      .badge-pending::before { background: #facc15; }

      .health-pre {
        font-size: 0.7rem; line-height: 1.5; color: #94a3b8;
        background: rgba(2,6,23,0.5); border: 1px solid #1e293b;
        border-radius: 0.5rem; padding: 0.6rem; max-height: 180px;
        overflow: auto; white-space: pre-wrap; word-break: break-all;
        font-family: 'JetBrains Mono', monospace;
      }

      /* Log section */
      .log-section { margin-top: 0.5rem; }
      .section-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 1rem;
      }
      .section-title { font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; }
      .log-count {
        font-size: 0.72rem; color: #64748b; background: rgba(30,41,59,0.6);
        padding: 0.25rem 0.65rem; border-radius: 9999px; border: 1px solid #1e293b;
      }

      /* Table */
      .table-wrapper {
        background: rgba(15,23,42,0.5); border: 1px solid #1e293b;
        border-radius: 0.75rem; overflow: hidden; backdrop-filter: blur(8px);
      }
      table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
      thead th {
        text-align: left; padding: 0.7rem 0.8rem; font-weight: 600;
        color: #64748b; font-size: 0.68rem; text-transform: uppercase;
        letter-spacing: 0.06em; border-bottom: 1px solid #1e293b;
        background: rgba(2,6,23,0.4); position: sticky; top: 0; z-index: 2;
      }
      .summary-row {
        border-bottom: 1px solid rgba(30,41,59,0.5);
        transition: background 0.15s; cursor: pointer;
      }
      .summary-row:hover { background: rgba(30,41,59,0.4); }
      .summary-row td { padding: 0.6rem 0.8rem; color: #cbd5e1; vertical-align: middle; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: #94a3b8; }
      .addr {
        max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: #818cf8;
      }
      .resp-msg {
        max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-size: 0.68rem; color: #94a3b8;
      }
      .duration { color: #64748b; font-size: 0.68rem; }
      .expand-icon { transition: transform 0.2s; display: inline-block; font-size: 0.7rem; color: #475569; }
      .expand-icon.open { transform: rotate(90deg); }

      /* ── Detail / expanded row ── */
      .detail-row { display: none; }
      .detail-row.open { display: table-row; }
      .detail-cell {
        padding: 0 0.8rem 1rem 0.8rem;
        background: rgba(8,12,30,0.6);
        border-bottom: 1px solid #1e293b;
      }
      .detail-grid {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 0.75rem; margin-top: 0.75rem;
      }
      @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }

      .detail-panel {
        background: rgba(15,23,42,0.5); border: 1px solid #1e293b;
        border-radius: 0.6rem; padding: 0.8rem; overflow: hidden;
      }
      .detail-panel-full { grid-column: 1 / -1; }
      .panel-label {
        font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em; color: #64748b; margin-bottom: 0.45rem;
        display: flex; align-items: center; gap: 0.4rem;
      }
      .panel-label .icon { font-style: normal; }

      /* Steps */
      .steps { display: flex; gap: 0; align-items: center; flex-wrap: wrap; }
      .step {
        display: flex; align-items: center; gap: 0.35rem;
        font-size: 0.72rem; color: #94a3b8; padding: 0.25rem 0;
      }
      .step-check { color: #4ade80; font-weight: 700; }
      .step-pending { color: #facc15; }
      .step-fail { color: #f87171; }
      .step-arrow { color: #334155; margin: 0 0.3rem; font-size: 0.65rem; }

      /* Transaction card */
      .tx-banner {
        background: linear-gradient(135deg, rgba(34,197,94,0.08), rgba(56,189,248,0.06));
        border: 1px solid rgba(34,197,94,0.2);
        border-radius: 0.5rem; padding: 0.6rem 0.75rem; margin-bottom: 0.6rem;
      }
      .tx-banner.error-banner {
        background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04));
        border-color: rgba(239,68,68,0.2);
      }
      .tx-banner-title {
        font-size: 0.72rem; font-weight: 700; color: #4ade80;
        display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.3rem;
      }
      .tx-banner.error-banner .tx-banner-title { color: #f87171; }
      .tx-hash {
        font-family: 'JetBrains Mono', monospace; font-size: 0.68rem;
        color: #cbd5e1; word-break: break-all; line-height: 1.4;
      }
      .explorer-links { display: flex; gap: 0.5rem; margin-top: 0.45rem; flex-wrap: wrap; }
      .explorer-btn {
        display: inline-flex; align-items: center; gap: 0.3rem;
        font-size: 0.65rem; font-weight: 600; padding: 0.25rem 0.6rem;
        border-radius: 9999px; text-decoration: none;
        transition: opacity 0.15s;
      }
      .explorer-btn:hover { opacity: 0.85; }
      .btn-mempool { background: rgba(251,146,60,0.15); color: #fb923c; border: 1px solid rgba(251,146,60,0.25); }
      .btn-titan { background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.2); }

      /* BMCP Data box */
      .bmcp-hex-box {
        background: rgba(2,6,23,0.6); border: 1px solid #1e293b;
        border-radius: 0.4rem; padding: 0.5rem 0.6rem; position: relative;
      }
      .bmcp-hex {
        font-family: 'JetBrains Mono', monospace; font-size: 0.62rem;
        color: #94a3b8; word-break: break-all; line-height: 1.5;
        max-height: 4.5rem; overflow-y: auto;
      }
      .copy-btn {
        position: absolute; top: 0.35rem; right: 0.35rem;
        background: rgba(251,146,60,0.15); color: #fb923c;
        border: 1px solid rgba(251,146,60,0.25); border-radius: 4px;
        font-size: 0.6rem; font-weight: 600; padding: 0.2rem 0.45rem;
        cursor: pointer; transition: background 0.15s;
      }
      .copy-btn:hover { background: rgba(251,146,60,0.3); }
      .bmcp-size {
        font-size: 0.62rem; color: #475569; margin-top: 0.3rem; text-align: right;
      }

      /* Info rows */
      .info-row {
        display: flex; justify-content: space-between; align-items: baseline;
        padding: 0.22rem 0; font-size: 0.72rem;
      }
      .info-label { color: #64748b; }
      .info-value { color: #cbd5e1; font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; }
      .info-value.addr-val { color: #818cf8; }

      /* CRE steps */
      .cre-step {
        display: flex; align-items: flex-start; gap: 0.5rem;
        padding: 0.3rem 0; font-size: 0.72rem;
      }
      .cre-icon { flex-shrink: 0; width: 1.1rem; text-align: center; }
      .cre-text { color: #94a3b8; }
      .cre-text strong { color: #cbd5e1; font-weight: 600; }

      /* Error detail */
      .error-box {
        background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15);
        border-radius: 0.4rem; padding: 0.5rem 0.65rem;
        font-family: 'JetBrains Mono', monospace; font-size: 0.66rem;
        color: #fca5a5; line-height: 1.5; word-break: break-all;
      }

      /* Empty state */
      .empty-state { text-align: center; padding: 3rem 1rem; color: #475569; }
      .empty-icon { font-size: 2rem; margin-bottom: 0.5rem; }
      .empty-text { font-size: 0.82rem; }
      .empty-sub { font-size: 0.72rem; color: #334155; margin-top: 0.4rem; }

      .table-scroll { max-height: 700px; overflow-y: auto; }
      .table-scroll::-webkit-scrollbar { width: 6px; }
      .table-scroll::-webkit-scrollbar-track { background: transparent; }
      .table-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }

      .live-dot {
        display: inline-block; width: 7px; height: 7px; border-radius: 50%;
        background: #22c55e; margin-right: 6px; animation: blink 1.5s infinite;
      }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

      .footer { margin-top: 1.5rem; text-align: center; font-size: 0.68rem; color: #334155; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="header-dot"></div>
        <h1><span>BMCP</span> Combined Backend</h1>
      </div>
      <p class="subtitle">
        ESP posts JSON intents to <code>/escrow/esp-intent</code> &middot;
        Bitcoin API at <code>/bitcoin/*</code>
      </p>

      <!-- Health Cards -->
      <div class="health-grid">
        <div class="health-card">
          <div class="card-header">
            <div class="card-title">Bitcoin API</div>
            <div id="btc-badge" class="badge badge-pending">Loading</div>
          </div>
          <pre id="btc-health" class="health-pre"></pre>
        </div>
        <div class="health-card">
          <div class="card-header">
            <div class="card-title">ESP Escrow</div>
            <div id="escrow-badge" class="badge badge-pending">Loading</div>
          </div>
          <pre id="escrow-health" class="health-pre"></pre>
        </div>
      </div>

      <!-- ESP Log Table -->
      <div class="log-section">
        <div class="section-header">
          <div class="section-title"><span class="live-dot"></span> ESP Request Log</div>
          <div id="log-count" class="log-count">0 requests</div>
        </div>
        <div class="table-wrapper">
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style="width:2rem"></th>
                  <th>#</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Chain</th>
                  <th>Receiver</th>
                  <th>Function</th>
                  <th>TX Hash</th>
                  <th>ms</th>
                </tr>
              </thead>
              <tbody id="esp-log-body">
                <tr>
                  <td colspan="9" class="empty-state">
                    <div class="empty-icon">📡</div>
                    <div class="empty-text">No ESP requests yet</div>
                    <div class="empty-sub">Waiting for ESP device to POST to /escrow/esp-intent …</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="footer">Auto-refreshes every 3 s &middot; Click a row to expand details</div>
    </div>

    <script>
      /* ── Health ──────────────────────────────────────── */
      async function fetchHealth(path, badgeEl, preEl) {
        try {
          const res = await fetch(path);
          const txt = await res.text();
          let parsed;
          try { parsed = JSON.parse(txt); } catch { parsed = { raw: txt }; }
          preEl.textContent = JSON.stringify(parsed, null, 2);
          if (res.ok) {
            badgeEl.textContent = 'Online';
            badgeEl.className = 'badge badge-ok';
          } else {
            badgeEl.textContent = 'Error ' + res.status;
            badgeEl.className = 'badge badge-err';
          }
        } catch (err) {
          badgeEl.textContent = 'Offline';
          badgeEl.className = 'badge badge-err';
          preEl.textContent = String(err);
        }
      }
      function refreshHealth() {
        fetchHealth('/bitcoin/health', document.getElementById('btc-badge'), document.getElementById('btc-health'));
        fetchHealth('/escrow/health', document.getElementById('escrow-badge'), document.getElementById('escrow-health'));
      }

      /* ── Helpers ─────────────────────────────────────── */
      function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
      function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s; }
      function truncHash(h) { return h ? h.slice(0, 10) + '…' + h.slice(-6) : '—'; }
      function formatTime(iso) {
        try { return new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }); }
        catch { return iso; }
      }
      function badgeHtml(status) {
        var cls = status === 'success' ? 'badge-ok' : status === 'error' ? 'badge-err' : 'badge-pending';
        var label = status === 'success' ? 'OK' : status === 'error' ? 'ERR' : '…';
        return '<span class="badge ' + cls + '">' + label + '</span>';
      }

      function copyText(text, btn) {
        navigator.clipboard.writeText(text).then(function() {
          var orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function() { btn.textContent = orig; }, 1200);
        });
      }

      /* ── Build detail panel for a log entry ──────────── */
      function buildDetail(log) {
        var html = '<div class="detail-cell">';

        // Steps pipeline
        var pipeOk = log.status === 'success';
        html += '<div style="margin-top:0.5rem;margin-bottom:0.6rem"><div class="steps">';
        html += '<div class="step"><span class="step-check">✓</span> Connected</div>';
        html += '<span class="step-arrow">→</span>';
        html += '<div class="step"><span class="' + (log.bmcpData ? 'step-check' : (log.status==='error' ? 'step-fail' : 'step-pending')) + '">'
              + (log.bmcpData ? '✓' : (log.status==='error' ? '✗' : '…')) + '</span> Encoded</div>';
        html += '<span class="step-arrow">→</span>';
        html += '<div class="step"><span class="' + (log.totalInput ? 'step-check' : (log.status==='error'&&!log.totalInput ? 'step-fail' : 'step-pending')) + '">'
              + (log.totalInput ? '✓' : (log.status==='error'&&!log.totalInput ? '✗' : '…')) + '</span> PSBT Created</div>';
        html += '<span class="step-arrow">→</span>';
        html += '<div class="step"><span class="' + (log.txHash ? 'step-check' : (log.status==='error'&&log.totalInput ? 'step-fail' : 'step-pending')) + '">'
              + (log.txHash ? '✓' : (log.status==='error'&&log.totalInput ? '✗' : '…')) + '</span> Signed</div>';
        html += '<span class="step-arrow">→</span>';
        html += '<div class="step"><span class="' + (pipeOk ? 'step-check' : (log.status==='error' ? 'step-fail' : 'step-pending')) + '">'
              + (pipeOk ? '✓' : (log.status==='error' ? '✗' : '…')) + '</span> Broadcast</div>';
        html += '</div></div>';

        if (log.status === 'success' && log.txHash) {
          // ── Success: TX banner ──
          html += '<div class="tx-banner">'
            + '<div class="tx-banner-title">✅ Bitcoin Transaction Broadcast Successfully!</div>'
            + '<div class="tx-hash">' + esc(log.txHash) + '</div>'
            + '<div class="explorer-links">'
            + '<a class="explorer-btn btn-mempool" href="https://mempool.space/testnet4/tx/' + esc(log.txHash) + '" target="_blank" rel="noopener">🟠 Mempool.space</a>'
            + '<a class="explorer-btn btn-titan" href="https://explorer.titan.io/testnet4/tx/' + esc(log.txHash) + '" target="_blank" rel="noopener">💎 Titan Explorer</a>'
            + '</div></div>';
        } else if (log.status === 'error') {
          html += '<div class="tx-banner error-banner">'
            + '<div class="tx-banner-title">❌ Request Failed</div>'
            + '<div class="error-box">' + esc(log.errorDetail || log.responseMessage || 'Unknown error') + '</div>'
            + '</div>';
        }

        html += '<div class="detail-grid">';

        // ── Left: BMCP Data ──
        if (log.bmcpData) {
          var dataBytes = (log.bmcpData.length - 2) / 2; // remove 0x prefix, hex chars / 2
          html += '<div class="detail-panel">'
            + '<div class="panel-label"><i class="icon">✅</i> Message Encoded</div>'
            + '<div class="bmcp-hex-box">'
            + '<div class="bmcp-hex" id="bmcp-data-' + log.id + '">' + esc(log.bmcpData) + '</div>'
            + '<button class="copy-btn" data-copy="' + log.id + '">📋 Copy</button>'
            + '</div>'
            + '<div class="bmcp-size">' + dataBytes + ' bytes</div>'
            + '</div>';
        }

        // ── Right: Transaction Info ──
        if (log.totalInput || log.escrowAddress) {
          html += '<div class="detail-panel">'
            + '<div class="panel-label"><i class="icon">⛓️</i> Transaction Info</div>';
          if (log.escrowAddress) html += '<div class="info-row"><span class="info-label">Escrow Wallet</span><span class="info-value addr-val" title="' + esc(log.escrowAddress) + '">' + truncate(log.escrowAddress, 22) + '</span></div>';
          if (log.totalInput) html += '<div class="info-row"><span class="info-label">Total Input</span><span class="info-value">' + log.totalInput.toLocaleString() + ' sats</span></div>';
          if (log.fee) html += '<div class="info-row"><span class="info-label">Fee</span><span class="info-value">' + log.fee.toLocaleString() + ' sats</span></div>';
          if (log.feeRate) html += '<div class="info-row"><span class="info-label">Fee Rate</span><span class="info-value">' + log.feeRate + ' sat/vB</span></div>';
          if (log.changeAmount) html += '<div class="info-row"><span class="info-label">Change</span><span class="info-value">' + log.changeAmount.toLocaleString() + ' sats</span></div>';
          if (log.opReturnSize) html += '<div class="info-row"><span class="info-label">OP_RETURN</span><span class="info-value">' + log.opReturnSize + ' bytes</span></div>';
          if (log.txSize) html += '<div class="info-row"><span class="info-label">TX Size</span><span class="info-value">~' + log.txSize + ' vB</span></div>';
          html += '</div>';
        }

        // ── Full-width: Cross-Chain Processing ──
        if (log.status === 'success' && log.txHash) {
          html += '<div class="detail-panel detail-panel-full">'
            + '<div class="panel-label"><i class="icon">🔗</i> Cross-Chain Processing via Chainlink CRE</div>'
            + '<div class="cre-step"><span class="cre-icon">⏳</span><span class="cre-text"><strong>Step 1:</strong> Waiting for 6 Bitcoin block confirmations</span></div>'
            + '<div class="cre-step"><span class="cre-icon">🔍</span><span class="cre-text"><strong>Step 2:</strong> BMCP Relayer decodes OP_RETURN data from Bitcoin transaction</span></div>'
            + '<div class="cre-step"><span class="cre-icon">⚡</span><span class="cre-text"><strong>Step 3:</strong> Chainlink Runtime Environment (CRE) processes via CCIP Router</span></div>'
            + '<div class="cre-step"><span class="cre-icon">✅</span><span class="cre-text"><strong>Step 4:</strong> Function executed on <strong>' + esc(log.destination_chain || 'EVM chain') + '</strong></span></div>'
            + '<div style="margin-top:0.55rem; padding-top:0.5rem; border-top:1px solid #1e293b;">'
            + '<div class="info-row"><span class="info-label">Your EVM Transaction</span></div>'
            + '<div style="font-size:0.7rem;color:#94a3b8;margin-top:0.15rem;">Once processed, <code style="background:rgba(30,41,59,0.7);padding:0.1rem 0.3rem;border-radius:3px;font-size:0.65rem;color:#818cf8;">' + esc(log.function_signature || '') + '</code> will be executed on <strong style="color:#cbd5e1;">' + esc(log.destination_chain || 'target chain') + '</strong> at receiver contract</div>'
            + '<div style="margin-top:0.3rem"><a href="https://sepolia.etherscan.io/address/' + esc(log.receiver || '') + '" target="_blank" rel="noopener" style="color:#818cf8;font-size:0.68rem;text-decoration:none;">View Receiver Contract on Etherscan →</a></div>'
            + '</div></div>';
        }

        // ── Request payload ──
        html += '<div class="detail-panel detail-panel-full">'
          + '<div class="panel-label"><i class="icon">📋</i> Request Payload</div>'
          + '<div class="info-row"><span class="info-label">Source IP</span><span class="info-value">' + esc(log.ip || '—') + '</span></div>'
          + '<div class="info-row"><span class="info-label">Destination Chain</span><span class="info-value">' + esc(log.destination_chain || '—') + '</span></div>'
          + '<div class="info-row"><span class="info-label">Receiver</span><span class="info-value addr-val">' + esc(log.receiver || '—') + '</span></div>'
          + '<div class="info-row"><span class="info-label">Function</span><span class="info-value">' + esc(log.function_signature || '—') + '</span></div>'
          + '<div class="info-row"><span class="info-label">Args</span><span class="info-value" style="font-size:0.62rem;max-width:70%;word-break:break-all;">' + esc(JSON.stringify(log.function_args)) + '</span></div>'
          + '<div class="info-row"><span class="info-label">Duration</span><span class="info-value">' + log.durationMs + ' ms</span></div>'
          + '</div>';

        html += '</div></div>';
        return html;
      }

      /* ── Render table ────────────────────────────────── */
      var openRows = {};

      function toggleRow(id) {
        var detailRow = document.getElementById('detail-' + id);
        var icon = document.getElementById('icon-' + id);
        if (!detailRow) return;
        if (openRows[id]) {
          detailRow.classList.remove('open');
          icon.classList.remove('open');
          delete openRows[id];
        } else {
          detailRow.classList.add('open');
          icon.classList.add('open');
          openRows[id] = true;
        }
      }

      async function refreshLogs() {
        try {
          var res = await fetch('/api/esp-logs');
          var data = await res.json();
          var logs = data.logs || [];
          document.getElementById('log-count').textContent = data.total + ' request' + (data.total !== 1 ? 's' : '');

          var tbody = document.getElementById('esp-log-body');
          if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">'
              + '<div class="empty-icon">📡</div>'
              + '<div class="empty-text">No ESP requests yet</div>'
              + '<div class="empty-sub">Waiting for ESP device to POST to /escrow/esp-intent …</div>'
              + '</td></tr>';
            return;
          }

          tbody.innerHTML = logs.map(function(log) {
            var isOpen = openRows[log.id] ? ' open' : '';
            var summaryRow = '<tr class="summary-row" onclick="toggleRow(' + log.id + ')">'
              + '<td><span class="expand-icon' + isOpen + '" id="icon-' + log.id + '">▶</span></td>'
              + '<td class="mono">' + log.id + '</td>'
              + '<td class="mono">' + formatTime(log.timestamp) + '</td>'
              + '<td>' + badgeHtml(log.status) + '</td>'
              + '<td>' + (esc(log.destination_chain) || '—') + '</td>'
              + '<td class="addr" title="' + esc(log.receiver || '') + '">' + (truncate(log.receiver, 14) || '—') + '</td>'
              + '<td class="mono">' + (truncate(log.function_signature, 20) || '—') + '</td>'
              + '<td class="mono" title="' + esc(log.txHash || log.responseMessage || '') + '">'
              +   (log.txHash ? '<a href="https://mempool.space/testnet4/tx/' + esc(log.txHash) + '" target="_blank" rel="noopener" style="color:#fb923c;text-decoration:none;">' + truncHash(log.txHash) + '</a>' : (truncate(log.responseMessage, 22) || '—'))
              + '</td>'
              + '<td class="duration">' + (log.status === 'pending' ? '…' : log.durationMs + 'ms') + '</td>'
              + '</tr>';

            var detailRow = '<tr class="detail-row' + isOpen + '" id="detail-' + log.id + '">'
              + '<td colspan="9">' + buildDetail(log) + '</td></tr>';

            return summaryRow + detailRow;
          }).join('');
        } catch (err) {
          console.error('Failed to fetch ESP logs:', err);
        }
      }

      /* ── Init ────────────────────────────────────────── */
      refreshHealth();
      refreshLogs();
      setInterval(refreshHealth, 5000);
      setInterval(refreshLogs, 3000);

      /* ── Delegated copy handler ─────────────────────── */
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.copy-btn[data-copy]');
        if (!btn) return;
        var id = btn.getAttribute('data-copy');
        var el = document.getElementById('bmcp-data-' + id);
        if (el) copyText(el.textContent, btn);
      });
    </script>
  </body>
</html>`);
});

// Mount services under clear prefixes to avoid route conflicts.
// Bitcoin API: /bitcoin/*
app.use('/bitcoin', bitcoinApiApp);

// ESP escrow: /escrow/*
app.use('/escrow', espEscrowApp);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Combined Espresso backend running on http://localhost:${PORT}`);
  console.log(`   Bitcoin API:   GET /bitcoin/health, POST /bitcoin/psbt, /bitcoin/broadcast`);
  console.log(`   ESP Escrow:    POST /escrow/esp-intent, GET /escrow/health`);
  console.log(`   ESP Logs:      GET /api/esp-logs`);
  console.log(`   Dashboard:     GET /`);
});
