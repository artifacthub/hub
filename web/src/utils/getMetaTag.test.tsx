import { render } from '@testing-library/react';

import getMetaTag from './getMetaTag';

interface Test {
  name: string;
  value: string | boolean;
  isTrue?: boolean;
}

const tests: Test[] = [
  {
    name: 'siteName',
    value: 'artifact hub',
  },
  {
    name: 'primaryColor',
    value: '#F57C00',
  },
  {
    name: 'motdSeverity',
    value: 'warning',
  },
  { name: 'githubAuth', value: true, isTrue: true },
  { name: 'githubAuth', value: false, isTrue: true },
  { name: 'allowPrivateRepositories', value: true, isTrue: true },
  { name: 'allowPrivateRepositories', value: false, isTrue: true },
];

describe('getMetaTag', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper value', () => {
      render(<meta name={`artifacthub:${tests[i].name}`} content={`${tests[i].value.toString()}`} />);
      const actual = getMetaTag(tests[i].name, tests[i].isTrue);
      expect(actual).toEqual(tests[i].value);
    });
  }
});
