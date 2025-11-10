import '@testing-library/jest-dom/vitest';

import { createRequire } from 'node:module';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

const noop = () => {};
Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });

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
  requireActual,
});

(globalThis as Record<string, unknown>).jest = jestShim;

vi.mock('jest-mock', () => ({
  mocked: vi.mocked,
}));
