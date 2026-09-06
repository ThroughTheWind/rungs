/**
 * The strict assert every test file imports — with one guard.
 *
 * F-059 / WI-095. `assert.equal(readFileSync(runner), bundle.toString())` on a
 * 186 KB artefact ran 221 s building a character-level diff of two values that
 * differed in type, then threw `RangeError: Array buffer allocation failed`;
 * the host went down three times before the cause was read from the log. A
 * comment at the two repaired call sites is a rule on rung 1, and this rule had
 * already been broken once — so the guard is mechanical: an equality assertion
 * whose operands are large **and differ** fails at once with a short message
 * naming the digest form, before the assertion library starts the diff. Equal
 * operands of any size pass exactly as before, and small operands keep the
 * readable diff that makes a failure debuggable.
 *
 * `tests-guard-large-equality` (`scripts/check-test-assert-guard.mjs`) holds
 * every `test/*.test.js` to importing assert from here, not from `node:assert`.
 */
import strict from 'node:assert/strict';

/** Above this, a failing character-level diff is a cost nobody meant to pay. */
export const LARGE_VALUE_BYTES = 32 * 1024;

const bytesOf = (value) =>
  typeof value === 'string' ? Buffer.byteLength(value) : ArrayBuffer.isView(value) ? value.byteLength : 0;

const sameBytes = (a, b) =>
  (typeof a === 'string' && typeof b === 'string' && a === b) ||
  (ArrayBuffer.isView(a) && ArrayBuffer.isView(b) && Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));

const kind = (value) => (typeof value === 'string' ? 'string' : ArrayBuffer.isView(value) ? value.constructor.name : typeof value);

function guarded(name) {
  const original = strict[name];
  return function (actual, expected, message) {
    const size = Math.max(bytesOf(actual), bytesOf(expected));
    if (size > LARGE_VALUE_BYTES && !sameBytes(actual, expected)) {
      throw new strict.AssertionError({
        message:
          `${message ? `${message}: ` : ''}assert.${name} on ${size.toLocaleString('en-US')} bytes ` +
          `(${kind(actual)} vs ${kind(expected)}) that differ — compare digests (contentHash / sha256), ` +
          'not bytes: a character-level diff of this size ran 221 s and exhausted memory (F-059)',
        actual: `<${kind(actual)}, ${bytesOf(actual).toLocaleString('en-US')} bytes>`,
        expected: `<${kind(expected)}, ${bytesOf(expected).toLocaleString('en-US')} bytes>`,
        operator: name,
        stackStartFn: guarded,
      });
    }
    return original(actual, expected, message);
  };
}

const assert = function assert(...args) {
  return strict(...args);
};
Object.assign(assert, strict);
// Only the positive forms: a negative assertion fails when the operands are
// equal, and equal operands are the cheap case.
for (const name of ['equal', 'strictEqual', 'deepEqual', 'deepStrictEqual']) {
  assert[name] = guarded(name);
}
assert.strict = assert;

export default assert;
