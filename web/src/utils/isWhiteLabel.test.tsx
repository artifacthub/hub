import { render } from '@testing-library/react';

import isWhiteLabel from './isWhiteLabel';

const tests = [
  {
    input: 'artifact hub',
    output: false,
  },
  {
    input: 'Artifact Hub',
    output: false,
  },
  {
    input: 'Artifact HUB',
    output: false,
  },
  {
    input: 'test',
    output: true,
  },
  {
    input: 'test 1',
    output: true,
  },
  {
    input: 'test 2',
    output: true,
  },
];

describe('isWhiteLabel', () => {
  for (let i = 0; i < tests.length; i++) {
    it('check if site is white label', () => {
      render(<meta name="artifacthub:siteName" content={`${tests[i].input}`} />);
      const actual = isWhiteLabel();
      expect(actual).toEqual(tests[i].output);
    });
  }
});
