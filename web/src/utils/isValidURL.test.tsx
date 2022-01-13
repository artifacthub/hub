import isValidURL from './isValidURL';

interface Test {
  url: string;
  result: boolean;
}

const tests: Test[] = [
  {
    url: '',
    result: false,
  },
  {
    url: 'test.com',
    result: false,
  },
  {
    url: 'http://test.com',
    result: true,
  },
  {
    url: 'https://test.com',
    result: true,
  },
  {
    url: 'oci://test.com',
    result: true,
  },
  {
    url: 'oci://test.com/registry/name',
    result: true,
  },
  {
    url: 'test.com/registry/name',
    result: false,
  },
];

describe('isValidURL', () => {
  for (let i = 0; i < tests.length; i++) {
    it('check if valid', () => {
      const actual = isValidURL(tests[i].url);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
