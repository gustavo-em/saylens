#!/usr/bin/env node

/**
 * A live view of what the detector is doing on one device, made to be filmed.
 *
 * Both platforms already log the same line once per measurement window:
 *
 *   Detector throughput: 8.4 fps; latest latency: 462 ms.
 *
 * Android writes it through Log.i and iOS through os_log, so the only thing
 * that differs between them is the command that produces the stream. This
 * reads whichever one is asked for, parses that single line, and pushes each
 * reading to a page that draws it.
 *
 * One device at a time on purpose: filming each phone separately and putting
 * them side by side in the edit is easier than wiring two log streams, and it
 * keeps the chart honest — each recording is that phone alone.
 *
 *   node scripts/live-benchmark/server.js --source=android
 *   node scripts/live-benchmark/server.js --source=ios --device=00008110-...
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const APP_PACKAGE = 'com.gustavoem.saylens';

/**
 * The line both platforms print, and the two numbers worth drawing.
 *
 * Either separator: the Android side formats with the device's own locale, so
 * a phone set to Portuguese logs "12,2 fps" where one set to English logs
 * "12.2 fps".
 */
const THROUGHPUT =
  /Detector throughput:\s*([\d.,]+)\s*fps;\s*latest latency:\s*([\d.,]+)\s*ms/;

const asNumber = text => Number(text.replace(',', '.'));

function parseArguments(argv) {
  const options = {
    source: 'android',
    device: null,
    port: 4600,
    label: null,
    chip: null,
  };

  for (const argument of argv.slice(2)) {
    const [key, value] = argument.replace(/^--/, '').split('=');
    if (key in options) options[key] = value ?? true;
  }

  options.port = Number(options.port) || 4600;
  return options;
}

/**
 * adb is rarely on PATH on a machine that only ever opens Android Studio, so
 * the SDK's own copy is the fallback rather than an error.
 */
function adbCommand() {
  if (process.env.ADB) return process.env.ADB;

  const fromSdk = path.join(
    process.env.ANDROID_HOME || path.join(process.env.HOME, 'Library/Android/sdk'),
    'platform-tools/adb',
  );
  return fs.existsSync(fromSdk) ? fromSdk : 'adb';
}

function logStream(options) {
  if (options.source === 'ios') {
    // os_log keeps the message out of the default stream unless it is asked
    // for by name, which is also what keeps every other subsystem out.
    const args = ['stream', '--style', 'compact', '--predicate',
      'eventMessage CONTAINS "Detector throughput"'];
    if (options.device) args.push('--device', options.device);
    return spawn('log', args);
  }

  const args = [];
  if (options.device) args.push('-s', options.device);
  // -T 1 starts at the tail. Without it logcat replays whatever is already in
  // the buffer, and a run's worth of old readings arrives in one burst with
  // the same arrival time, drawing a vertical wall at the left of the chart.
  args.push('logcat', '-T', '1', '-v', 'time', 'LesingoDetector:I', '*:S');
  return spawn(adbCommand(), args);
}

const options = parseArguments(process.argv);
const clients = new Set();
const history = [];

function broadcast(reading) {
  history.push(reading);
  if (history.length > 600) history.shift();

  const payload = `data: ${JSON.stringify(reading)}\n\n`;
  for (const client of clients) client.write(payload);
}

const child = logStream(options);
let pending = '';

child.stdout.on('data', chunk => {
  pending += chunk.toString();
  const lines = pending.split('\n');
  pending = lines.pop();

  for (const line of lines) {
    const match = THROUGHPUT.exec(line);
    if (match == null) continue;

    broadcast({
      at: Date.now(),
      fps: asNumber(match[1]),
      latencyMs: asNumber(match[2]),
    });
  }
});

child.stderr.on('data', chunk => process.stderr.write(chunk));
child.on('error', error => {
  console.error(`Could not read the device log: ${error.message}`);
  process.exit(1);
});
child.on('exit', code => {
  console.error(`The log stream ended with code ${code}.`);
  process.exit(code ?? 1);
});

// Read per request rather than once at boot, so editing the page and
// reloading the tab is enough to see the change.
const readPage = () =>
  fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const server = http.createServer((request, response) => {
  if (request.url.startsWith('/events')) {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // A viewer that joins late still gets a chart with a shape in it.
    for (const reading of history) {
      response.write(`data: ${JSON.stringify(reading)}\n\n`);
    }

    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }

  const meta = JSON.stringify({
    label: options.label || (options.source === 'ios' ? 'iPhone' : 'Android'),
    chip: options.chip || '',
    source: options.source,
  });

  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(readPage().replace('__DEVICE_META__', meta));
});

server.listen(options.port, () => {
  console.log(`Reading the ${options.source} log for ${APP_PACKAGE}.`);
  console.log(`Open http://localhost:${options.port} and record that window.`);
});
