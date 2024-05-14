import minutesToNearestInterval from './minutesToNearestInterval';

interface Test {
  input: { duration: number; decrement?: number };
  result: number;
}

const tests: Test[] = [
  {
    input: { duration: 20 },
    result: 17,
  },
  {
    input: { duration: 40, decrement: 5 },
    result: 32,
  },
  {
    input: { duration: 30 },
    result: 17,
  },
  {
    input: { duration: 60, decrement: 10 },
    result: 7,
  },
];

describe('minutesToNearestInterval', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dateNowSpy: any;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1648154630000);
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  for (let i = 0; i < tests.length; i++) {
    it('returns minutes to nearest interval', async () => {
      const actual = minutesToNearestInterval(tests[i].input.duration, tests[i].input.decrement);
      expect(actual).toStrictEqual(tests[i].result);
    });
  }
});
