import { SearchFiltersURL } from '../types';
import { prepareQueryString } from './prepareQueryString';

interface Test {
  query: SearchFiltersURL;
  result: string;
}

const tests: Test[] = [
  {
    query: {
      pageNumber: 1,
      filters: {
        org: ['org'],
      },
      deprecated: true,
    },
    result: '?org=org&deprecated=true&sort=relevance&page=1',
  },
  {
    query: {
      pageNumber: 1,
      tsQueryWeb: 'test',
      filters: {},
      deprecated: false,
    },
    result: '?ts_query_web=test&sort=relevance&page=1',
  },
  {
    query: {
      pageNumber: 1,
      filters: {},
      deprecated: false,
    },
    result: '?sort=relevance&page=1',
  },
  {
    query: {
      pageNumber: 3,
      filters: {
        org: ['org1', 'org2'],
        repo: ['stable', 'incubator'],
      },
      deprecated: true,
    },
    result: '?org=org1&org=org2&repo=stable&repo=incubator&deprecated=true&sort=relevance&page=3',
  },
  {
    query: {
      pageNumber: 10,
      filters: {
        user: ['user1', 'user2'],
      },
      deprecated: true,
    },
    result: '?user=user1&user=user2&deprecated=true&sort=relevance&page=10',
  },
  {
    query: {
      pageNumber: 1,
      filters: {},
      verifiedPublisher: true,
    },
    result: '?verified_publisher=true&sort=relevance&page=1',
  },
  {
    query: {
      pageNumber: 1,
      filters: {},
      official: true,
    },
    result: '?official=true&sort=relevance&page=1',
  },
];

describe('prepareQueryString', () => {
  for (let i = 0; i < tests.length; i++) {
    it('renders proper queryString', () => {
      const actual = prepareQueryString(tests[i].query);
      expect(actual).toBe(tests[i].result);
    });
  }
});
