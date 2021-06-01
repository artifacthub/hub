import cleanLoginUrlParams from './cleanLoginUrlParams';

interface Test {
  input: string;
  output: string;
}

const tests: Test[] = [
  { input: '', output: '' },
  { input: '?modal=modal', output: '' },
  { input: '?modal=modal&redirect=/home', output: '' },
  { input: '?page=1&kind=3', output: 'page=1&kind=3' },
  {
    input: '?modal=crds&file=akkaclusters.app.lightbend.com',
    output: 'file=akkaclusters.app.lightbend.com',
  },
];

describe('cleanLoginUrlParams', () => {
  for (let i = 0; i < tests.length; i++) {
    it('cleans properly url search', () => {
      const actual = cleanLoginUrlParams(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
