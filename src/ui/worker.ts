import { realpathSync } from 'node:fs';
import { modulesRoot } from '../ejected.ts';
import { appendLedger, runGatesObserved } from '../check.ts';
import { inspectCheckPlan, inspectDiagnostics, inspectPreview, inspectSnapshot } from './inspect.ts';
import { errorText, fingerprint, LIMITS, sourceLinks, sourceText } from './read.ts';

function send(value: unknown): Promise<void> {
  if (Buffer.byteLength(JSON.stringify(value)) > LIMITS.resultBytes)
    throw new Error('Structured result exceeds the 32 MiB limit. No complete result can be reported.');
  return new Promise((resolve, reject) => {
    if (!process.connected) return reject(new Error('Inspector disconnected.'));
    process.send!(value, (error) => (error ? reject(error) : resolve()));
  });
}
function event(value: unknown) {
  // Observers are synchronous. Sending is queued by IPC; terminal delivery below waits for its callback.
  if (Buffer.byteLength(JSON.stringify(value)) > LIMITS.resultBytes)
    throw new Error('Gate result exceeds the structured result limit.');
  process.send?.({ type: 'event', value });
}

process.once('message', async (message: any) => {
  try {
    const root = realpathSync.native(message.root);
    let value: unknown;
    switch (message.operation) {
      case 'snapshot':
        value = inspectSnapshot(root);
        break;
      case 'freshness': {
        const read = fingerprint(root, modulesRoot());
        value = {
          generation: read.generation,
          complete: read.complete,
          issues: read.issues,
          capturedAt: new Date().toISOString(),
        };
        break;
      }
      case 'source': {
        const read = sourceText(root, message.path);
        value = { ...read, links: sourceLinks(root, message.path, read.text) };
        break;
      }
      case 'diagnostics':
        value = inspectDiagnostics(root);
        break;
      case 'preview':
        value = inspectPreview(root, message.preview);
        break;
      case 'check-plan':
        value = inspectCheckPlan(root, message.tier ?? undefined);
        break;
      case 'check': {
        const plan = inspectCheckPlan(root, message.tier ?? undefined);
        if (!plan.allowed) throw new Error(plan.reasons.join(' '));
        if (plan.generation !== message.generation)
          throw new Error('Repository changed after the displayed plan. Refresh the plan before running.');
        const started = new Date().toISOString();
        const runs = await runGatesObserved(root, message.tier ?? undefined, {
          start: (gate) => event({ kind: 'start', gate: gate.id }),
          result: (run) => event({ kind: 'result', run }),
          output: (gate, stream, text) => event({ kind: 'output', gate, stream, text }),
          limit: (message) => event({ kind: 'limit', message }),
        });
        if (runs.length) appendLedger(root, runs, started.slice(0, 10), started);
        const after = fingerprint(root, modulesRoot());
        value = {
          runs,
          startedAt: started,
          finishedAt: new Date().toISOString(),
          generation: plan.generation,
          endGeneration: after.generation,
          changed: plan.generation !== after.generation || !after.complete,
          scope: 'Recorded result for this invocation. External, ignored and time-dependent inputs are not certified.',
        };
        break;
      }
      default:
        throw new Error('Unsupported inspector operation.');
    }
    await send({ type: 'result', value });
  } catch (error) {
    try {
      await send({ type: 'error', message: errorText(error) });
    } catch {
      process.exitCode = 1;
    }
  } finally {
    if (process.connected) process.disconnect();
  }
});
