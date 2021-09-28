import findClosestNumberIndex from './findClosestNumberIndex';

interface Test {
  array: number[];
  number: number;
  output: number;
}

const tests: Test[] = [
  { array: [1, 2, 3, 4, 5], number: 4, output: 3 },
  { array: [10, 20, 30, 40, 50, 60], number: 32, output: 2 },
  { array: [10, 20, 30, 40, 50, 60], number: 12, output: 0 },
  { array: [10, 20, 30, 40, 50, 60], number: 19, output: 1 },
  { array: [10, 20, 30, 40, 50, 60], number: 8, output: 0 },
  { array: [10, 20, 30, 40, 50, 60], number: 78, output: 5 },
  { array: [10, 20, 30, 40, 50, 60], number: -10, output: 0 },
];

describe('findClosestNumberIndex', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns correct string', () => {
      const actual = findClosestNumberIndex(tests[i].array, tests[i].number);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
