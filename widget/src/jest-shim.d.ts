declare const jest: {
  mock: typeof import('vitest').vi.mock;
  resetAllMocks: typeof import('vitest').vi.resetAllMocks;
  requireActual: NodeRequire;
  mocked<T>(item: T, options?: { shallow?: boolean }): T;
};

declare module 'jest-mock' {
  const mocked: typeof import('vitest').vi.mocked;
  export { mocked };
}
