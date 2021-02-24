import formatStringForYAML from './formatStringForYAML';

interface Test {
  text: string;
  result?: string;
}

const tests: Test[] = [
  { text: '', result: '' },
  { text: 'text', result: 'text' },
  { text: 'Text.', result: 'Text.' },
  { text: '*/2 * * * *', result: '"*/2 * * * *"' },
  { text: '[test]', result: '"[test]"' },
  { text: '{test}', result: '"{test}"' },
  { text: 'test: test1', result: '"test: test1"' },
  { text: 'user@email.com', result: '"user@email.com"' },
  { text: 'what?', result: '"what?"' },
  { text: 'hi!', result: '"hi!"' },
  { text: '100%', result: '"100%"' },
  { text: 'c&s', result: '"c&s"' },
  { text: '1 + 2 = 3', result: '"1 + 2 = 3"' },
  { text: '#cncfartifacthub', result: '"#cncfartifacthub"' },
  { text: '1 - 1', result: '"1 - 1"' },
  { text: 'a|b', result: '"a|b"' },
  { text: '<html>', result: '"<html>"' },
];

describe('formatStringForYAML', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper content', () => {
      const actual = formatStringForYAML(tests[i].text);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
