import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, fork, spawn, type ChildProcess } from 'node:child_process';
import { errorText, LIMITS } from './read.ts';

const HERE = import.meta.url;
const SOURCE = HERE.endsWith('.ts');
const WORKER = fileURLToPath(new URL(SOURCE ? './worker.ts' : './ui-worker.js', HERE));
const ASSETS = new URL(SOURCE ? './assets/' : './ui-assets/', HERE);

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface UiOptions {
  root: string;
  port?: number;
  readOnly?: boolean;
  noOpen?: boolean;
}
export interface UiJob {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'error' | 'interrupted';
  plan: any;
  startedAt: string;
  finishedAt?: string;
  currentGate?: string;
  runs: any[];
  output: string;
  outputTruncated: boolean;
  result?: any;
  error?: string;
  termination?: string;
}

/** Stops this owned worker/process group, without claiming rollback or detached-child containment. */
export async function stopWorker(child: ChildProcess): Promise<string> {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null)
    return 'Worker already exited; detached descendants are not tracked.';
  if (process.platform === 'win32')
    return new Promise((done) => {
      execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 }, (error) => {
        if (error) {
          child.kill();
          done(`Worker termination requested; Windows tree termination could not be verified: ${error.message}`);
        } else
          done(
            'Windows accepted termination of the owned worker tree. Detached processes and side effects are not rolled back.',
          );
      });
    });
  try {
    process.kill(-child.pid, 'SIGTERM');
    await new Promise((done) => setTimeout(done, 150));
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      /* group already gone */
    }
    return 'Termination requested for the owned process group. Detached processes and side effects are not rolled back.';
  } catch (error) {
    child.kill();
    return `Worker termination requested; process-group termination could not be verified: ${errorText(error)}`;
  }
}

export async function startUi(options: UiOptions) {
  const root = realpathSync.native(resolve(options.root));
  if (!statSync(root).isDirectory()) throw new Error('Select an existing repository directory.');
  if (options.port !== undefined && (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535))
    throw new Error('--port must be an integer from 1 to 65535.');
  const token = randomBytes(32).toString('base64url');
  const tokenBytes = Buffer.from(token);
  const workers = new Set<ChildProcess>(),
    jobs = new Map<string, UiJob>(),
    jobWorkers = new Map<string, ChildProcess>();
  const plans = new Map<string, { value: any; expires: number }>();
  const sources = new Set<string>();
  let closed = false,
    reads = 0,
    snapshot: any,
    diagnostics: any;
  let pendingSnapshot: Promise<any> | undefined;
  let pendingFreshness: Promise<any> | undefined;
  const previews: Record<string, any> = {};
  let origin = '',
    host = '';

  function worker(operation: string, params: any = {}, onEvent?: (value: any) => void) {
    if (closed) throw new HttpError(503, 'closing', 'The inspector is shutting down.');
    if (operation !== 'check' && reads >= 3)
      throw new HttpError(503, 'busy', 'Inspection is busy. Retry after the current read finishes.');
    if (operation !== 'check') reads++;
    const child = fork(WORKER, [], {
      cwd: root,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      execArgv: ['--max-old-space-size=512'],
    });
    workers.add(child);
    let stderr = '',
      settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const promise = new Promise<any>((resolveResult, reject) => {
      const finish = (error?: Error, value?: any) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (operation !== 'check') reads--;
        error ? reject(error) : resolveResult(value);
      };
      child.stderr?.on('data', (chunk) => {
        stderr = (stderr + chunk.toString()).slice(-8192);
      });
      child.stdout?.resume();
      child.on('error', (error) => finish(error));
      child.on('message', (message: any) => {
        if (settled) return;
        if (!message || typeof message !== 'object') return;
        if (message.type === 'event') {
          try {
            onEvent?.(message.value);
          } catch (error) {
            finish(new Error(errorText(error)));
            void stopWorker(child);
          }
        }
        if (message.type === 'result') finish(undefined, message.value);
        if (message.type === 'error') finish(new HttpError(409, 'read-failed', String(message.message)));
      });
      child.on('exit', (code, signal) => {
        workers.delete(child);
        finish(new Error(`Inspector worker exited before a complete result (${signal ?? code}). ${stderr}`));
      });
      if (operation !== 'check')
        timer = setTimeout(() => {
          finish(
            new HttpError(504, 'read-timeout', 'Inspection exceeded 60 seconds; no complete result is available.'),
          );
          void stopWorker(child);
        }, 60_000);
      child.send({ operation, root, ...params }, (error) => {
        if (error) finish(error);
      });
    });
    return { child, promise };
  }

  function allowLinks(links: any[]) {
    for (const link of links ?? []) if (link.path && link.exists) sources.add(link.path);
  }
  function capture() {
    if (!pendingSnapshot)
      pendingSnapshot = worker('snapshot')
        .promise.then((value) => {
          snapshot = {
            ...value,
            readOnly: !!options.readOnly,
            jobs: [...jobs.values()].map(({ id, status, startedAt }) => ({ id, status, startedAt })),
          };
          sources.clear();
          for (const path of value.sources) sources.add(path);
          for (const job of jobs.values())
            for (const run of job.runs)
              for (const finding of run.findings ?? []) if (typeof finding.file === 'string') sources.add(finding.file);
          for (const group of diagnostics?.reported ?? [])
            for (const finding of group.findings) if (typeof finding.file === 'string') sources.add(finding.file);
          return snapshot;
        })
        .finally(() => {
          pendingSnapshot = undefined;
        });
    return pendingSnapshot;
  }

  function headers(response: ServerResponse) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    );
  }
  function json(response: ServerResponse, value: unknown, status = 200) {
    const body = JSON.stringify(value);
    if (Buffer.byteLength(body) > LIMITS.resultBytes)
      throw new HttpError(
        413,
        'result-limit',
        'Result exceeds 32 MiB. Narrow the selected repository; this is not a complete result.',
      );
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(body);
  }
  async function body(request: IncomingMessage, allowed: string[]) {
    if (!request.headers['content-type']?.startsWith('application/json'))
      throw new HttpError(415, 'json-required', 'Send application/json.');
    if (Number(request.headers['content-length']) > LIMITS.bodyBytes) {
      request.resume();
      throw new HttpError(413, 'body-limit', 'Request body exceeds 16 KiB.');
    }
    let bytes = 0;
    const chunks: Buffer[] = [];
    await new Promise<void>((done, reject) => {
      request.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > LIMITS.bodyBytes) reject(new HttpError(413, 'body-limit', 'Request body exceeds 16 KiB.'));
        else chunks.push(chunk);
      });
      request.once('end', done);
      request.once('error', reject);
      request.once('aborted', () => reject(new HttpError(400, 'aborted', 'Request body was interrupted.')));
    });
    let value;
    try {
      value = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    } catch {
      throw new HttpError(400, 'invalid-json', 'Request body is not valid JSON.');
    }
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).some((key) => !allowed.includes(key))
    )
      throw new HttpError(400, 'invalid-arguments', 'Unsupported action arguments.');
    return value;
  }
  function authorize(request: IncomingMessage) {
    if (request.headers.host !== host)
      throw new HttpError(403, 'host-refused', 'Host does not match this local inspector.');
    const requestOrigin = request.headers.origin;
    if (requestOrigin !== undefined && requestOrigin !== origin)
      throw new HttpError(403, 'origin-refused', 'Cross-origin requests are not allowed.');
    const value = request.headers.authorization;
    const supplied = Buffer.from(typeof value === 'string' && value.startsWith('Bearer ') ? value.slice(7) : '');
    if (supplied.length !== tokenBytes.length || !timingSafeEqual(supplied, tokenBytes))
      throw new HttpError(401, 'access-required', 'Open the launch address from this inspector process to connect.');
  }

  async function route(request: IncomingMessage, response: ServerResponse) {
    headers(response);
    if (request.headers.host !== host || (request.headers.origin !== undefined && request.headers.origin !== origin))
      throw new HttpError(403, 'origin-refused', 'This request does not belong to the selected local inspector.');
    const url = new URL(request.url ?? '/', origin);
    const staticFile = (
      {
        '/': ['index.html', 'text/html'],
        '/app.js': ['app.js', 'text/javascript'],
        '/style.css': ['style.css', 'text/css'],
      } as Record<string, string[]>
    )[url.pathname];
    if (staticFile && request.method === 'GET' && !url.search) {
      response.writeHead(200, { 'Content-Type': `${staticFile[1]}; charset=utf-8` });
      response.end(readFileSync(new URL(staticFile[0], ASSETS)));
      return;
    }
    authorize(request);
    if (request.method === 'GET') {
      if (url.pathname === '/api/snapshot') return json(response, await capture());
      if (url.pathname === '/api/freshness') {
        pendingFreshness ??= worker('freshness').promise.finally(() => {
          pendingFreshness = undefined;
        });
        return json(response, await pendingFreshness);
      }
      if (url.pathname === '/api/source') {
        const path = url.searchParams.get('path') ?? '';
        if (!sources.has(path))
          throw new HttpError(
            403,
            'source-refused',
            'This path is not an inspection source. Refresh or follow a source link first.',
          );
        const value = await worker('source', { path }).promise;
        allowLinks(value.links);
        return json(response, value);
      }
      if (url.pathname === '/api/export') {
        if (!snapshot) throw new HttpError(409, 'refresh-required', 'Load a snapshot before exporting.');
        response.setHeader('Content-Disposition', 'attachment; filename="rungs-inspection.json"');
        return json(response, {
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          snapshot,
          diagnostics,
          previews,
          jobs: [...jobs.values()],
        });
      }
      const match = /^\/api\/jobs\/([a-f0-9-]+)$/.exec(url.pathname);
      if (match && jobs.has(match[1])) return json(response, jobs.get(match[1]));
      throw new HttpError(404, 'not-found', 'No read operation at this address.');
    }
    if (request.method !== 'POST')
      throw new HttpError(405, 'method-refused', 'Use the supported read or explicit action operation.');
    if (url.pathname === '/api/diagnostics') {
      await body(request, []);
      diagnostics = await worker('diagnostics').promise;
      for (const group of diagnostics.reported)
        for (const finding of group.findings) if (typeof finding.file === 'string') sources.add(finding.file);
      return json(response, diagnostics);
    }
    if (url.pathname === '/api/preview') {
      const args = await body(request, ['operation']);
      if (!['upgrade', 'archive'].includes(args.operation))
        throw new HttpError(400, 'invalid-operation', 'Choose upgrade or archive.');
      const value = await worker('preview', { preview: args.operation }).promise;
      previews[args.operation] = value;
      return json(response, value);
    }
    if (url.pathname === '/api/check-plan') {
      const args = await body(request, ['tier']);
      if (args.tier !== undefined && args.tier !== null && typeof args.tier !== 'string')
        throw new HttpError(400, 'invalid-tier', 'Tier must be a declared name or null for default.');
      const value = await worker('check-plan', { tier: args.tier }).promise;
      const id = randomUUID();
      if (options.readOnly) {
        value.allowed = false;
        value.reasons.push('This inspector was started in read-only mode.');
      }
      for (const [key, plan] of plans) if (plan.expires < Date.now()) plans.delete(key);
      if (plans.size >= 20) plans.delete(plans.keys().next().value!);
      plans.set(id, { value, expires: Date.now() + 5 * 60_000 });
      return json(response, { ...value, id, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() });
    }
    if (url.pathname === '/api/jobs') {
      const args = await body(request, ['planId']);
      if (options.readOnly) throw new HttpError(403, 'read-only', 'Check execution is disabled in read-only mode.');
      if ([...jobs.values()].some((job) => job.status === 'running'))
        throw new HttpError(409, 'job-running', 'This inspector already has a running check job.');
      const plan = plans.get(args.planId);
      if (!plan || plan.expires < Date.now())
        throw new HttpError(409, 'plan-expired', 'Refresh the check plan before running.');
      if (!plan.value.allowed) throw new HttpError(409, 'plan-refused', plan.value.reasons.join(' '));
      plans.delete(args.planId);
      // Bound retained history. Export explicitly before launching more runs if every result is needed.
      if (jobs.size >= 8)
        throw new HttpError(
          409,
          'job-limit',
          'This session holds eight runs. Export the results and restart the inspector for more.',
        );
      const id = randomUUID();
      const job: UiJob = {
        id,
        status: 'running',
        plan: plan.value,
        startedAt: new Date().toISOString(),
        runs: [],
        output: '',
        outputTruncated: false,
      };
      jobs.set(id, job);
      let resultBytes = 0;
      const running = worker('check', { tier: plan.value.tier, generation: plan.value.generation }, (value) => {
        if (job.status !== 'running') return;
        if (value.kind === 'limit') throw new Error(value.message);
        if (value.kind === 'start') job.currentGate = value.gate;
        if (value.kind === 'result') {
          resultBytes += Buffer.byteLength(JSON.stringify(value.run));
          if (resultBytes > LIMITS.resultBytes / 2)
            throw new Error('Retained gate findings exceed the session result limit.');
          job.runs.push(value.run);
          for (const finding of value.run.findings ?? [])
            if (typeof finding.file === 'string') sources.add(finding.file);
        }
        if (value.kind === 'output') {
          const combined = Buffer.from(job.output + `[${value.gate} ${value.stream}] ${value.text}`);
          if (combined.length > LIMITS.outputBytes) job.outputTruncated = true;
          job.output = combined.subarray(Math.max(0, combined.length - LIMITS.outputBytes)).toString('utf8');
        }
      });
      jobWorkers.set(id, running.child);
      running.promise
        .then((value) => {
          if (job.status !== 'running') return;
          job.runs = value.runs;
          const { runs: _runs, ...metadata } = value;
          job.result = metadata;
          job.status = value.runs.some((run: any) => run.status !== 'pass') ? 'failed' : 'completed';
        })
        .catch((error) => {
          if (job.status !== 'running') return;
          job.status = 'error';
          job.error = errorText(error);
        })
        .finally(() => {
          job.finishedAt = new Date().toISOString();
          job.currentGate = undefined;
          jobWorkers.delete(id);
        });
      return json(response, job, 202);
    }
    const cancel = /^\/api\/jobs\/([a-f0-9-]+)\/cancel$/.exec(url.pathname);
    if (cancel && jobs.has(cancel[1])) {
      await body(request, []);
      const job = jobs.get(cancel[1])!;
      if (job.status === 'running') {
        job.status = 'interrupted';
        job.finishedAt = new Date().toISOString();
        const child = jobWorkers.get(job.id);
        job.termination = child ? await stopWorker(child) : 'Worker exit is still being observed.';
      }
      return json(response, job);
    }
    throw new HttpError(404, 'not-found', 'No action at this address.');
  }

  const server = createServer((request, response) => {
    void route(request, response).catch((error) => {
      if (response.headersSent || response.destroyed) return response.destroy();
      try {
        json(
          response,
          { error: { code: error instanceof HttpError ? error.code : 'internal-error', message: errorText(error) } },
          error instanceof HttpError ? error.status : 500,
        );
      } catch {
        response.destroy();
      }
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.maxHeadersCount = 40;
  await new Promise<void>((done, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      done();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not establish the local server address.');
  host = `127.0.0.1:${address.port}`;
  origin = `http://${host}`;
  async function close() {
    if (closed) return [];
    closed = true;
    plans.clear();
    sources.clear();
    for (const job of jobs.values())
      if (job.status === 'running') {
        job.status = 'interrupted';
        job.finishedAt = new Date().toISOString();
      }
    const shutdown = new Promise<void>((done) => server.close(() => done()));
    server.closeAllConnections();
    const reports = await Promise.all([...workers].map(stopWorker));
    await shutdown;
    return reports;
  }
  return { root, origin, token, url: `${origin}/#${token}`, server, close };
}

export async function openBrowser(url: string): Promise<void> {
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  await new Promise<void>((done, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code) => (code === 0 ? done() : reject(new Error(`Browser opener exited ${code}.`))));
    child.unref();
    // A desktop opener may remain attached to an already-open browser; do not block serving.
    const timer = setTimeout(done, 1500);
    timer.unref();
  });
}

export async function runUi(options: UiOptions, launchBrowser = openBrowser) {
  const ui = await startUi(options);
  console.log(
    `\nrungs ui — ${ui.root}\n\n  ${ui.url}\n\n  Foreground local inspector${options.readOnly ? ' (read-only)' : ''}. Press Ctrl+C to stop.\n`,
  );
  const close = async () => {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    return ui.close();
  };
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    const reports = await close();
    for (const report of reports) console.log(report);
    console.log('Local inspector stopped.');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  if (!options.noOpen) {
    try {
      await launchBrowser(ui.url);
    } catch (error) {
      console.error(`Browser did not open: ${errorText(error)}\nOpen the local address above.`);
    }
  }
  return { ...ui, close };
}
