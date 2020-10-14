import getTextBetweenParenthesis from './getTextBetweenParenthesis';

interface Test {
  text: string;
  result?: string;
}

const tests: Test[] = [
  { text: '', result: undefined },
  { text: 'text', result: undefined },
  { text: 'quay.io/3scale/apicast-operator:v0.2.0 (redhat 7.7)', result: 'redhat 7.7' },
  {
    text: 'usr/share/ceph/mgr/dashboard/frontend/package-lock.json',
    result: undefined,
  },
  { text: 'appsody/application-operator:0.6.0 (redhat 8.2)', result: 'redhat 8.2' },
  { text: 'docker.io/apache/camel-k:1.1.1 (ubuntu 18.04)', result: 'ubuntu 18.04' },
  { text: 'altinity/clickhouse-operator:0.10.0 (alpine 3.10.5)', result: 'alpine 3.10.5' },
  { text: 'altinity/clickhouse-operator:0.10.0 (alpine 3.10.5) (redhat 8.2)', result: 'alpine 3.10.5' },
];

describe('getTextBetweenParenthesis', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper content', () => {
      const actual = getTextBetweenParenthesis(tests[i].text);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
