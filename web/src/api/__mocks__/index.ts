import { vi } from 'vitest';

type MockRecord = Record<string | symbol, unknown>;

const API = new Proxy<MockRecord>({} as MockRecord, {
  get(target, property: string | symbol) {
    if (!target[property]) {
      target[property] = vi.fn();
    }
    return target[property];
  },
});

export default API as unknown as typeof import('../index').default;
