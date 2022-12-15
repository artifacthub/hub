import calculateDiffInYears from './calculateDiffInYears';

interface Test {
  input: {
    pastDate: number;
    currentDate?: number;
  };
  output: number;
}

const tests: Test[] = [
  {
    input: {
      pastDate: 1671099389,
      currentDate: 1671099389,
    },
    output: 0,
  },
  {
    input: {
      pastDate: 1669976186,
      currentDate: 1671099389,
    },
    output: 0.036,
  },
  {
    input: {
      pastDate: 1643796986,
      currentDate: 1671099389,
    },
    output: 0.868,
  },
  {
    input: {
      pastDate: 1631960186,
      currentDate: 1671099389,
    },
    output: 1.242,
  },
  {
    input: {
      pastDate: 1602088526,
      currentDate: 1671099389,
    },
    output: 2.188,
  },
];

describe('calculateDiffInYears', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns diff in years', () => {
      const actual = calculateDiffInYears(tests[i].input.pastDate, tests[i].input.currentDate);
      expect(actual.toFixed(3)).toEqual(tests[i].output.toFixed(3));
    });
  }
});
