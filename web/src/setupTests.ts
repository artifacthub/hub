import '@testing-library/jest-dom/vitest';

import { createRequire } from 'node:module';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

const noop = () => {};
Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });

const originalStderrWrite = process.stderr.write.bind(process.stderr);
type WriteCallback = (err?: Error | null | undefined) => void;

process.stderr.write = (
  chunk: string | Uint8Array<ArrayBufferLike>,
  encoding?: BufferEncoding | WriteCallback,
  cb?: WriteCallback
) => {
  const decoded =
    typeof chunk === 'string'
      ? chunk
      : typeof encoding === 'string'
        ? Buffer.from(chunk).toString(encoding)
        : Buffer.from(chunk).toString();
  if (decoded.includes('Warning: `--localstorage-file` was provided without a valid path')) {
    return true;
  }
  if (typeof encoding === 'function') {
    return originalStderrWrite(chunk, encoding);
  }
  return originalStderrWrite(chunk, encoding, cb);
};

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (args[0] === 'Could not parse CSS stylesheet') {
    return;
  }
  originalConsoleError(...args);
};

afterEach(() => {
  cleanup();
});

const requireActual = createRequire(import.meta.url);

const jestShim = Object.assign(Object.create(null), vi, {
  advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
  clearAllMocks: vi.clearAllMocks.bind(vi),
  clearAllTimers: vi.clearAllTimers.bind(vi),
  fn: vi.fn.bind(vi),
  isMockFunction: vi.isMockFunction.bind(vi),
  mock: vi.mock.bind(vi),
  resetAllMocks: vi.resetAllMocks.bind(vi),
  restoreAllMocks: vi.restoreAllMocks.bind(vi),
  runAllTimers: vi.runAllTimers.bind(vi),
  runOnlyPendingTimers: vi.runOnlyPendingTimers.bind(vi),
  spyOn: vi.spyOn.bind(vi),
  useFakeTimers: vi.useFakeTimers.bind(vi),
  useRealTimers: vi.useRealTimers.bind(vi),
  requireActual: requireActual,
});

(globalThis as Record<string, unknown>).jest = jestShim;

vi.mock('jest-mock', () => ({
  mocked: vi.mocked,
}));
