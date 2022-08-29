import removeEmojis from './removeEmojis';

const tests = [
  { input: 'text', result: 'text' },
  { input: '🏃 TL;DR', result: 'TL;DR' },
  { input: '📜 Using the Chart', result: 'Using the Chart' },
  { input: '⚠️ Special alert', result: 'Special alert' },
  { input: '📝 Notes', result: 'Notes' },
  { input: '⚖️ License', result: 'License' },
  { input: 'Supported cloud provider ☁', result: 'Supported cloud provider' },
  { input: 'GoFish (deprecated 🕸️)', result: 'GoFish (deprecated )' },
  { input: 'Legal Disclaimer 👮', result: 'Legal Disclaimer' },
  { input: 'Libraries & Tools 🔥', result: 'Libraries & Tools' },
  { input: '    txt with extra spaces    ', result: 'txt with extra spaces' },
];

describe('removeEmojis', () => {
  for (let i = 0; i < tests.length; i++) {
    it(`renders proper text for ${tests[i].input}`, () => {
      const actual = removeEmojis(tests[i].input);
      expect(actual).toBe(tests[i].result);
    });
  }
});
