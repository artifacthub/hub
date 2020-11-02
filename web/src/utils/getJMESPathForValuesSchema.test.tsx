import getJMESPathForValuesSchema from './getJMESPathForValuesSchema';

interface Test {
  value: string;
  path?: string;
  result: string;
}

const tests: Test[] = [
  {
    value: 'server',
    result: 'server',
  },
  {
    value: 'server',
    path: 'hub',
    result: 'hub.server',
  },
  {
    value: 'clientSecret',
    path: 'hub.server.oauth.google',
    result: 'hub.server.oauth.google.clientSecret',
  },
  {
    value: 'allowPrivateRepositories',
    path: 'hub.server',
    result: 'hub.server.allowPrivateRepositories',
  },
  {
    value: 'kubernetes.io/ingress.class',
    path: 'hub.ingress.annotations',
    result: `hub.ingress.annotations."kubernetes\\.io/ingress\\.class"`,
  },
];

describe('getJMESPathForValuesSchema', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper content', () => {
      const actual = getJMESPathForValuesSchema(tests[i].value, tests[i].path);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
