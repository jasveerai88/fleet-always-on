# fleet-always-on-01 — the fleet's always-on light node

A tiny, zero-dependency HTTP service (Node standard library only) that runs
on **Render Free** and stays awake because **our own GitHub Actions pinger
keeps knocking on its door**.

## Why this exists

FleetOS (see `../FLEETOS-DESIGN.md`) has exactly two never-sleeping homes:
this Muse VM (the coordinator) and the MacBook. Everything else free is
sessions, quotas or spin-downs. Render Free gives a real, public, always-on
**light** endpoint for ₹0 / CAD $0 and no card — *if* something keeps it
warm. This node is that endpoint: watchers, webhook receivers, queue
endpoints and glue. It is **not** heavy compute and must never be routed
batch work.

Honest size: **0.1 CPU / 512 MB RAM** per free web service. A candle, not
an engine — kept deliberately tiny so it never pretends to be more.

## The keep-awake design

- Render Free spins a web service down after **15 minutes without
  inbound traffic**, and the next request pays a ~1 minute cold start.
- `keepalive.yml` is a GitHub Actions workflow (cron `*/10 * * * *`) that
  curls `GET /health`. A ping every 10 minutes keeps a permanent 5-minute
  safety margin under the spin-down line.
- The pinger lives in a **public** repo of ours: public-repo standard
  runner minutes are free and unlimited, so the knocking costs nothing.
  (Private-repo minutes come out of the ~$12/month included compute —
  don't spend them on pinging.)
- The pinger retries 3 times with a 20 s gap, so a single cold start
  (~60 s) is absorbed instead of failing the run.

## Hours math

Render Free pools **750 instance-hours per workspace per month**. One
service awake 24/7 uses:

- 30-day month: 720 h — inside the pool, 30 h spare
- 31-day month: 744 h — inside the pool, 6 h spare

So **one** always-on service fits the free pool in every month. A second
always-on service would not (1,440+ h > 750 h) — exactly one node, by
design.

## Endpoints

| Route | Response |
|---|---|
| `GET /health` | JSON: `status`, `service` (`fleet-always-on-01`), `boot_time`, `uptime_s`, `requests` |
| `GET /` | Plain text: alive line with boot time |
| anything else | 404 JSON |

`requests` is an in-memory counter: it resets whenever the service
restarts, which makes it a free restart detector — if the number drops,
the node slept or rebooted and the pinger has a gap to explain.

## Files

| File | Role |
|---|---|
| `server.js` | The whole service. Node ≥18, zero dependencies |
| `package.json` | `npm start` → `node server.js`; Render sets `PORT` |
| `render.yaml` | Render Blueprint: web service, plan `free`, health check `/health` |
| `keepalive.yml` | Ready to drop into `.github/workflows/` of a chosen public repo |
| `DEPLOY-RUNBOOK.md` | Exact deploy + verify steps for the browser step |

## Honest limits

- **If the pinger lapses >15 min, the node sleeps.** Next hit pays the
  ~1 min cold start. It is "always-on while pinged", not a guaranteed
  24/7 machine — GitHub cron is best-effort and can be delayed.
- **Disk is ephemeral.** Spin-down, restart or redeploy wipes the
  filesystem. Nothing stateful may live on this node; state belongs on
  this VM / HF storage.
- **0.1 CPU / 512 MB.** Watchers and glue only. Anything heavier routes
  to Kaggle / Actions / Workers per the FleetOS routing table.
- **Free-tier drift.** Render can change free terms (four of eleven
  sources checked on 2026-11-09 were already dead or paywalled). If the
  node dies by policy, the fleet loses a candle, not the coordinator —
  this VM remains the always-on home of last resort.

## Local run

```bash
node server.js          # listens on $PORT or 10000
curl localhost:10000/health
```
