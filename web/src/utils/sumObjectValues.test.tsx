import sumObjectValues from './sumObjectValues';

interface Test {
  data: { [key: string]: number | undefined };
  result: number;
}

const tests: Test[] = [
  { data: {}, result: 0 },
  { data: { a: undefined, b: undefined }, result: 0 },
  { data: { a: undefined, b: 2 }, result: 2 },
  { data: { a: 1, b: 2, c: 3 }, result: 6 },
  { data: { a: 1, b: 2, c: 3, d: 4 }, result: 10 },
];

describe('sumObjectValues', () => {
  for (let i = 0; i < tests.length; i++) {
    it('renturns sumatory', () => {
      const actual = sumObjectValues(tests[i].data);
      expect(actual).toBe(tests[i].result);
    });
  }
});
