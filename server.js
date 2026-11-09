// fleet-always-on-01 — tiny zero-dependency HTTP service (Node stdlib only).
//
// Purpose: the FleetOS always-on light node. Runs on Render Free
// (0.1 CPU / 512 MB). Watchers, queues and glue only — NOT heavy compute.
//
// Endpoints:
//   GET /health -> JSON { status, service, boot_time, uptime_s, requests }
//   GET /       -> plain-text alive line
//   anything else -> 404 JSON
//
// A GitHub Actions pinger (keepalive.yml) curls /health every 10 minutes
// so the service never crosses Render's 15-minute idle spin-down line.

"use strict";

const http = require("http");

const SERVICE_NAME = "fleet-always-on-01";
const PORT = process.env.PORT || 10000;
const bootTime = new Date();
let requestCount = 0;

const server = http.createServer((req, res) => {
  requestCount += 1;

  if (req.method === "GET" && req.url === "/health") {
    const body = JSON.stringify({
      status: "ok",
      service: SERVICE_NAME,
      boot_time: bootTime.toISOString(),
      uptime_s: Math.floor((Date.now() - bootTime.getTime()) / 1000),
      requests: requestCount,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
    return;
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`${SERVICE_NAME} is alive since ${bootTime.toISOString()}\n`);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on port ${PORT}`);
});
