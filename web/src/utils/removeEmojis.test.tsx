import removeEmojis from './removeEmojis';

const tests = [
  { input: 'text', result: 'text' },
  { input: '🏃 TL;DR', result: 'TL;DR' },
  { input: '📜 Using the Chart', result: 'Using the Chart' },
  { input: '⚠️ Special alert', result: 'Special alert' },
  { input: '📝 Notes', result: 'Notes' },
  { input: '⚖️ License', result: 'License' },
];

describe('removeEmojis', () => {
  for (let i = 0; i < tests.length; i++) {
    it(`renders proper text for ${tests[i].input}`, () => {
      const actual = removeEmojis(tests[i].input);
      expect(actual).toBe(tests[i].result);
    });
  }
});
