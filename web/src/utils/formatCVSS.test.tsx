import formatCVSS from './formatCVSS';

const tests = [
  { input: 'AV:N/AC:M/Au:N/C:P/I:P/A:N', output: { AV: 'N', AC: 'M', Au: 'N', C: 'P', I: 'P', A: 'N' } },
  { input: 'AV:N/AC:M/Au:N/C:P/I:P/A:P', output: { AV: 'N', AC: 'M', Au: 'N', C: 'P', I: 'P', A: 'P' } },
  { input: 'AV:L/AC:H/Au:N/C:P/I:P/A:P', output: { AV: 'L', AC: 'H', Au: 'N', C: 'P', I: 'P', A: 'P' } },
  { input: 'AV:N/AC:M/Au:S/C:P/I:P/A:P', output: { AV: 'N', AC: 'M', Au: 'S', C: 'P', I: 'P', A: 'P' } },
  { input: 'AV:N/AC:M/Au:N/C:C/I:C/A:P', output: { AV: 'N', AC: 'M', Au: 'N', C: 'C', I: 'C', A: 'P' } },
  { input: 'AV:N/AC:M/Au:N/C:P/I:P/A:C', output: { AV: 'N', AC: 'M', Au: 'N', C: 'P', I: 'P', A: 'C' } },
  { input: 'AV:A/AC:M/Au:N/C:P/I:P/A:P', output: { AV: 'A', AC: 'M', Au: 'N', C: 'P', I: 'P', A: 'P' } },
  { input: 'AV:A/AC:H/Au:N/C:P/I:P/A:P', output: { AV: 'A', AC: 'H', Au: 'N', C: 'P', I: 'P', A: 'P' } },
  { input: 'AV:N/AC:M/Au:N/C:P/I:P/A:P', output: { AV: 'N', AC: 'M', Au: 'N', C: 'P', I: 'P', A: 'P' } },
];

describe('formatCVSS', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper content', () => {
      const actual = formatCVSS(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
