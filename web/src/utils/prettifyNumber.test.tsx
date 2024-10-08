import prettifyNumber from './prettifyNumber';

const tests = [
  { number: 1, result: 1 },
  { number: 9, result: 9 },
  { number: 100, result: 100 },
  { number: 999, result: 999 },
  { number: 1000, result: '1k' },
  { number: 1760, result: '1.76k' },
  { number: 30000, result: '30k' },
  { number: 85300, result: '85.3k', digits: 3 },
  { number: 59000000, result: '59M' },
  { number: 872389379, result: '872.39M' },
  { number: 76498237927, digits: 3, result: '76.498G' },
  { number: 8789378978948, result: '8.79T' },

  // eslint-disable-next-line no-loss-of-precision
  { number: 9083509438032985, result: '9.08P' },

  // eslint-disable-next-line no-loss-of-precision
  { number: 847892398156232876438, result: '847.89E' },
];

describe('prettifyNumber', () => {
  for (let i = 0; i < tests.length; i++) {
    it(`renders proper number for ${tests[i].number}`, () => {
      const actual = prettifyNumber(tests[i].number, tests[i].digits);
      expect(actual).toBe(tests[i].result);
    });
  }
});
