'use strict';

/**
 * Shared, dependency-free Chrome DevTools Protocol harness.
 *
 * Extracted from release-browser-smoke.js so that every browser-based release
 * check (smoke + responsive matrix) drives the same validation-environment
 * browser through the same code path. Uses only Node built-ins plus the
 * global WebSocket shipped with modern Node, so the project stays
 * dependency-free and production behavior is untouched.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

/**
 * Hosts whose failures are environmental (offline validation sandbox), not
 * regressions introduced by the résumé content update.
 */
const THIRD_PARTY_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'via.placeholder.com'
];

/** Pre-existing Test Lab placeholder media that has never resolved. */
const KNOWN_MISSING_ASSETS = /placeholder\.(?:mp4|mp3)/i;

function findBrowser() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  const cache = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  if (fs.existsSync(cache)) {
    const dirs = fs.readdirSync(cache)
      .filter((name) => name.startsWith('chromium-'))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const dir of dirs) {
      const binary = path.join(cache, dir, 'chrome-win', 'chrome.exe');
      if (fs.existsSync(binary)) return binary;
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpJson(port, route) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: route }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.setTimeout(2000, () => request.destroy(new Error('devtools http timeout')));
  });
}

/**
 * Classifies a browser log entry as a blocking regression or a known
 * environmental/asset failure that predates this feature.
 */
function classifyLog(entry) {
  const urlText = entry.url || '';
  const isThirdParty = THIRD_PARTY_HOSTS.some((host) => urlText.includes(host));
  if (isThirdParty) return 'environmental';
  if (KNOWN_MISSING_ASSETS.test(urlText) || KNOWN_MISSING_ASSETS.test(entry.text || '')) {
    return 'environmental';
  }
  return 'blocking';
}

class CdpSession {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
  }

  async open() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', () => reject(new Error(`cannot open ${this.url}`)), { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message} (${JSON.stringify(message.error)})`));
        else resolve(message.result);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
    return this;
  }

  on(listener) { this.listeners.push(listener); }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30000);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true
    });
    if (result.exceptionDetails) {
      throw new Error(`page evaluate failed: ${result.exceptionDetails.text} ${JSON.stringify(result.exceptionDetails.exception?.description || '')}`);
    }
    return result.result.value;
  }

  close() { try { this.socket.close(); } catch { /* ignore */ } }
}

/**
 * Launches the validation environment's headless browser and returns a
 * controller with `openPage()` and `dispose()`.
 *
 * Returns null when no browser runner is available.
 */
async function launchBrowser() {
  const browserPath = findBrowser();
  if (!browserPath) return null;

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prdu-chrome-'));
  const port = 9411 + Math.floor(Math.random() * 120);
  const child = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--hide-scrollbars',
    '--mute-audio',
    'about:blank'
  ], { stdio: 'ignore' });

  let version = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      version = await httpJson(port, '/json/version');
      break;
    } catch {
      await sleep(250);
    }
  }

  if (!version) {
    child.kill();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch { /* ignore */ }
    return null;
  }

  const browser = await new CdpSession(version.webSocketDebuggerUrl).open();

  return {
    browserPath,
    version,
    port,
    browser,

    /**
     * Opens a page at a fixed emulated viewport and collects every error
     * channel (uncaught exceptions, console.error, and browser log entries).
     */
    async openPage({ url, width, height, mobile = false, settleMs = 1600 }) {
      const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
      const session = await new CdpSession(`ws://127.0.0.1:${port}/devtools/page/${targetId}`).open();

      const consoleErrors = [];
      const pageExceptions = [];
      const logEntries = [];

      session.on((message) => {
        if (message.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(message.params.type)) {
          consoleErrors.push(message.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
        }
        if (message.method === 'Runtime.exceptionThrown') {
          const details = message.params.exceptionDetails;
          pageExceptions.push(details.exception?.description || details.text);
        }
        if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
          logEntries.push(message.params.entry);
        }
      });

      await session.send('Runtime.enable');
      await session.send('Log.enable');
      await session.send('Page.enable');
      await session.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile
      });

      const loaded = new Promise((resolve) => {
        session.on((message) => { if (message.method === 'Page.loadEventFired') resolve(); });
      });

      await session.send('Page.navigate', { url });
      await Promise.race([loaded, sleep(15000)]);
      await sleep(settleMs);

      return {
        session,
        consoleErrors,
        pageExceptions,
        logEntries,
        get blockingLogs() { return logEntries.filter((entry) => classifyLog(entry) === 'blocking'); },
        get environmentalLogs() { return logEntries.filter((entry) => classifyLog(entry) !== 'blocking'); },
        evaluate: (expression) => session.evaluate(expression),
        async close() {
          session.close();
          await browser.send('Target.closeTarget', { targetId });
        }
      };
    },

    async dispose() {
      browser.close();
      child.kill();
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  };
}

module.exports = {
  BROWSER_CANDIDATES,
  THIRD_PARTY_HOSTS,
  KNOWN_MISSING_ASSETS,
  CdpSession,
  findBrowser,
  sleep,
  httpJson,
  classifyLog,
  launchBrowser
};
