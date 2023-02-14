import { render } from '@testing-library/react';

import getSampleQueries from './getSampleQueries';

const tests = [
  {
    input: '',
    output: [],
  },
  {
    input: 'null',
    output: [],
  },
  {
    input: '[]',
    output: [],
  },
  { input: '{{ .sampleQueries }}', output: [] },
  {
    input:
      '[{"name":"OLM operators for databases","querystring":"kind=3\u0026ts_query_web=database"},{"name":"Helm Charts provided by Bitnami","querystring":"kind=0\u0026org=bitnami"},{"name":"Packages of any kind related to etcd","querystring":"ts_query_web=etcd"},{"name":"Falco rules for CVE","querystring":"kind=1\u0026ts_query_web=cve"},{"name":"Packages from verified publishers","querystring":"verified_publisher=true"},{"name":"Official Prometheus packages","querystring":"ts_query_web=prometheus\u0026official=true"},{"name":"Operators with auto pilot capabilities","querystring":"capabilities=auto+pilot"},{"name":"Packages with Apache-2.0 license","querystring":"license=Apache-2.0"},{"name":"OPA policies with MIT license","querystring":"kind=2\u0026license=MIT"},{"name":"Helm plugins","querystring":"kind=6"},{"name":"Kubectl plugins","querystring":"kind=5"},{"name":"Tekton tasks","querystring":"kind=7"}]',
    output: [
      {
        name: 'OLM operators for databases',
        querystring: 'kind=3&ts_query_web=database',
      },
      {
        name: 'Helm Charts provided by Bitnami',
        querystring: 'kind=0&org=bitnami',
      },
      {
        name: 'Packages of any kind related to etcd',
        querystring: 'ts_query_web=etcd',
      },
      {
        name: 'Falco rules for CVE',
        querystring: 'kind=1&ts_query_web=cve',
      },
      {
        name: 'Packages from verified publishers',
        querystring: 'verified_publisher=true',
      },
      {
        name: 'Official Prometheus packages',
        querystring: 'ts_query_web=prometheus&official=true',
      },
      {
        name: 'Operators with auto pilot capabilities',
        querystring: 'capabilities=auto+pilot',
      },
      {
        name: 'Packages with Apache-2.0 license',
        querystring: 'license=Apache-2.0',
      },
      {
        name: 'OPA policies with MIT license',
        querystring: 'kind=2&license=MIT',
      },
      {
        name: 'Helm plugins',
        querystring: 'kind=6',
      },
      {
        name: 'Kubectl plugins',
        querystring: 'kind=5',
      },
      {
        name: 'Tekton tasks',
        querystring: 'kind=7',
      },
    ],
  },
  {
    input: '[{"name":"OLM operators for databases","querystring":"kind=3\u0026ts_query_web=database"}]',
    output: [
      {
        name: 'OLM operators for databases',
        querystring: 'kind=3&ts_query_web=database',
      },
    ],
  },
];

describe('getSampleQueries', () => {
  for (let i = 0; i < tests.length; i++) {
    it('get correct array', () => {
      render(<meta name="artifacthub:sampleQueries" content={`${tests[i].input}`} />);
      const actual = getSampleQueries();
      expect(actual).toEqual(tests[i].output);
    });
  }
});
