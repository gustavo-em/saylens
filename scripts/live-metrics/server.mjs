#!/usr/bin/env node
/**
 * Live detector metrics for a connected Android device.
 *
 * The numbers the benchmark script prints after the fact, streamed while the
 * app runs: detector throughput and latency come from the app's own log, CPU,
 * memory and the CPU temperature come from the device every few seconds. The
 * page is served from here because a browser cannot reach adb on its own.
 *
 *   node scripts/live-metrics/server.mjs [--port 4599] [--package com.x.y]
 */

import { spawn, execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] != null
    ? process.argv[index + 1]
    : fallback;
}

const PORT = Number(flag('port', 4599));
const PACKAGE = flag('package', 'com.gustavoem.saylens');
/** The device is polled rather than watched: `top` alone costs it a second. */
const POLL_INTERVAL_MS = 3000;
/** Twenty minutes of history at the rate the detector reports. */
const MAX_SAMPLES = 400;

const state = {
  device: null,
  workers: null,
  cores: null,
  camera: null,
  detector: [],
  system: [],
  lastLogAtMs: null,
};

const clients = new Set();

function publish(event, payload) {
  const line = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) client.write(line);
}

function push(list, sample) {
  list.push(sample);
  if (list.length > MAX_SAMPLES) list.shift();
}

function adb(args) {
  return new Promise(resolve => {
    execFile('adb', args, { timeout: 8000 }, (error, stdout) => {
      resolve(error ? null : stdout);
    });
  });
}

async function readDevice() {
  const out = await adb(['devices', '-l']);
  if (out == null) return null;

  const line = out
    .split('\n')
    .slice(1)
    .find(entry => /\sdevice(\s|$)/.test(entry));
  if (line == null) return null;

  const serial = line.trim().split(/\s+/)[0];
  const model = /model:(\S+)/.exec(line)?.[1] ?? serial;
  return { serial, model };
}

/**
 * One `top` frame and one thermal dump. Both are read on the same tick so the
 * CPU load and the temperature that follows from it line up on the chart.
 */
async function readSystem() {
  const [top, thermal] = await Promise.all([
    adb(['shell', 'top', '-b', '-n', '1']),
    adb(['shell', 'dumpsys', 'thermalservice']),
  ]);

  let cpuPercent = null;
  let residentMb = null;

  const row = top
    ?.split('\n')
    .find(line => line.trimEnd().endsWith(PACKAGE));

  if (row != null) {
    const fields = row.trim().split(/\s+/);
    const cpu = Number(fields[8]);
    if (Number.isFinite(cpu)) cpuPercent = cpu;

    const resident = /^([\d.]+)([KMG])$/.exec(fields[5] ?? '');
    if (resident != null) {
      const scale = { K: 1 / 1024, M: 1, G: 1024 }[resident[2]];
      residentMb = Number(resident[1]) * scale;
    }
  }

  const temperature = thermal == null ? null : cpuTemperature(thermal);

  if (cpuPercent == null && residentMb == null && temperature == null) return;

  push(state.system, {
    atMs: Date.now(),
    cpuPercent,
    residentMb,
    temperature,
  });
  publish('system', state.system.at(-1));
}

/** The warmest CPU sensor the device reports, since a phone has several. */
function cpuTemperature(dump) {
  let warmest = null;

  for (const match of dump.matchAll(
    /Temperature\{mValue=([-\d.]+),\s*mType=(\d+)/g,
  )) {
    if (match[2] !== '1') continue;

    const value = Number(match[1]);
    if (Number.isFinite(value) && (warmest == null || value > warmest)) {
      warmest = value;
    }
  }

  return warmest;
}

function handleLogLine(line) {
  state.lastLogAtMs = Date.now();

  // The device formats decimals with its own separator, so "6,2" and "6.2"
  // both have to parse.
  const throughput =
    /Detector throughput: ([\d.,]+) fps; latest latency: ([\d.,]+) ms/.exec(
      line,
    );
  if (throughput != null) {
    const sample = {
      atMs: Date.now(),
      inferencesPerSecond: Number(throughput[1].replace(',', '.')),
      latencyMs: Number(throughput[2].replace(',', '.')),
    };
    push(state.detector, sample);
    publish('detector', sample);
    return;
  }

  const configured = /Maximum CPU workers: (\d+) of (\d+) cores/.exec(line);
  if (configured != null) {
    state.workers = Number(configured[1]);
    state.cores = Number(configured[2]);
    publish('meta', meta());
    return;
  }

  const reconfigured = /reconfigured with (\d+) CPU workers/.exec(line);
  if (reconfigured != null) {
    state.workers = Number(reconfigured[1]);
    publish('meta', meta());
    return;
  }

  const camera = /\[Lesingo camera\] (.+)$/.exec(line);
  if (camera != null) {
    state.camera = camera[1].trim();
    publish('meta', meta());
  }
}

function meta() {
  return {
    device: state.device,
    workers: state.workers,
    cores: state.cores,
    camera: state.camera,
    package: PACKAGE,
  };
}

let logcat = null;

/**
 * What the log already holds. The detector announces its worker count when it
 * starts, so a page opened against an app that is already running would show
 * nothing about it until the next launch.
 */
async function backfill() {
  const dump = await adb([
    'logcat',
    '-d',
    '-v',
    'time',
    '-s',
    'LesingoDetector:I',
    'ReactNativeJS:I',
  ]);
  if (dump == null) return;

  for (const line of dump.split('\n').slice(-400)) {
    const configured = /Maximum CPU workers: (\d+) of (\d+) cores/.exec(line);
    if (configured != null) {
      state.workers = Number(configured[1]);
      state.cores = Number(configured[2]);
    }

    const reconfigured = /reconfigured with (\d+) CPU workers/.exec(line);
    if (reconfigured != null) state.workers = Number(reconfigured[1]);

    const camera = /\[Lesingo camera\] (.+)$/.exec(line);
    if (camera != null) state.camera = camera[1].trim();
  }

  publish('meta', meta());
}

function watchLog() {
  if (logcat != null) return;

  logcat = spawn('adb', [
    'logcat',
    '-v',
    'time',
    '-s',
    'LesingoDetector:I',
    'ReactNativeJS:I',
  ]);

  let carry = '';
  logcat.stdout.on('data', chunk => {
    const lines = (carry + chunk.toString()).split('\n');
    carry = lines.pop() ?? '';
    for (const line of lines) handleLogLine(line);
  });

  // A device that goes away takes the stream with it; the poll loop notices
  // and starts a new one when it comes back.
  const stop = () => {
    logcat = null;
  };
  logcat.on('close', stop);
  logcat.on('error', stop);
}

async function poll() {
  const device = await readDevice();
  const changed = device?.serial !== state.device?.serial;
  state.device = device;

  if (device == null) {
    if (logcat != null) logcat.kill();
    logcat = null;
    if (changed) publish('meta', meta());
    return;
  }

  if (changed) {
    state.workers = null;
    state.camera = null;
    publish('meta', meta());
    await backfill();
  }

  watchLog();
  await readSystem();
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (url.pathname === '/stream') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    response.write(
      `event: snapshot\ndata: ${JSON.stringify({
        meta: meta(),
        detector: state.detector,
        system: state.system,
      })}\n\n`,
    );

    clients.add(response);
    const beat = setInterval(() => response.write(': beat\n\n'), 15000);
    request.on('close', () => {
      clearInterval(beat);
      clients.delete(response);
    });
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const page = await readFile(join(HERE, 'index.html'));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page);
    return;
  }

  response.writeHead(404).end('not found');
});

server.listen(PORT, () => {
  console.log(`Live metrics on http://localhost:${PORT} (${PACKAGE})`);
});

poll();
setInterval(poll, POLL_INTERVAL_MS);
