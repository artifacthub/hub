import { SearchFiltersURL } from '../types';
import prepareQueryString from './prepareQueryString';

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
    result: '?page=1&deprecated=true&org=org',
  },
  {
    query: {
      pageNumber: 1,
      tsQueryWeb: 'test',
      filters: {},
      deprecated: false,
    },
    result: '?page=1&ts_query_web=test',
  },
  {
    query: {
      pageNumber: 1,
      filters: {},
      deprecated: false,
    },
    result: '?page=1',
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
    result: '?page=3&deprecated=true&org=org1&org=org2&repo=stable&repo=incubator',
  },
  {
    query: {
      pageNumber: 10,
      filters: {
        user: ['user1', 'user2'],
      },
      deprecated: true,
    },
    result: '?page=10&deprecated=true&user=user1&user=user2',
  },
  {
    query: {
      pageNumber: 1,
      filters: {},
      verifiedPublisher: true,
    },
    result: '?page=1&verified_publisher=true',
  },
  {
    query: {
      pageNumber: 1,
      filters: {},
      official: true,
    },
    result: '?page=1&official=true',
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
