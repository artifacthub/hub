import escapeRegExp from './escapeRegExp';

// prettier-ignore
const tests = [
  {input: 'test', output: 'test'},
  {input: '', output: ''},
  {
    input: 'All of these should be escaped:  ^ $ * + ? . ( ) | { } [ ]',
    output: 'All of these should be escaped:  \\^ \\$ \\* \\+ \\? \\. \\( \\) \\| \\{ \\} \\[ \\]',
  },
  { input: 'name (te', output: 'name \\(te' },
];

describe('escapeRegExp', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper string', () => {
      const actual = escapeRegExp(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
